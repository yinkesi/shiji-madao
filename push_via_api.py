#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""在 git 传输（github.com:443）不可达时，改用 GitHub Git Data API 推送当前文件快照。

原理：api.github.com 往往仍可访问（gh 能用），于是把工作区中已被 git 跟踪的文件
按 blobs → tree → commit → ref 的顺序提交，完全绕开 git-over-HTTPS。

用法：
    python push_via_api.py                    # 默认 yinkesi/shiji-madao 的 main 分支
    python push_via_api.py owner/repo branch

前提：gh 已登录（gh auth status），且 api.github.com 可达。
注意：调用 gh 时的 API 路径不要带前导斜杠——Git Bash 会把 /repos/... 改写成文件系统路径；
      读取路径列表务必用 `git ls-files -z`，否则中文文件名会被 git 转义成 \\345\\256... 形式。
"""
import base64
import json
import subprocess
import sys

USE_LOCAL_AUTHOR = False        # 置 True 可强制使用本地 git 身份署名
REPO = sys.argv[1] if len(sys.argv) > 1 else "yinkesi/shiji-madao"
BRANCH = sys.argv[2] if len(sys.argv) > 2 else "main"
NUL = chr(0)


def api(method, path, payload=None, allow_fail=False):
    cmd = ["gh", "api", "--method", method, path]
    if payload is not None:
        cmd += ["--input", "-"]
    r = subprocess.run(cmd, input=(json.dumps(payload) if payload is not None else None),
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        if allow_fail:
            return None
        raise SystemExit("gh api 失败 %s %s\n%s" % (method, path, (r.stderr or r.stdout)[:400]))
    return json.loads(r.stdout) if r.stdout.strip() else {}


def git_bytes(*args):
    """取原始字节：绕开 Windows 文本解码与 git 路径转义"""
    return subprocess.run(["git"] + list(args), capture_output=True, check=True).stdout


def tracked_files():
    """以 NUL 分隔读取（-z），按 UTF-8 解码，中文文件名才不会被转义"""
    raw = git_bytes("ls-files", "-z")
    return [p.decode("utf-8") for p in raw.split(b"\0") if p.strip()]


def main():
    branch = BRANCH
    files = tracked_files()
    meta = git_bytes("log", "-1", "--pretty=%B%x00%an%x00%ae").decode("utf-8").split(NUL)
    message, author_name, author_email = meta[0].strip(), meta[1], meta[2]
    print("仓库 %s 分支 %s，文件 %d 个" % (REPO, branch, len(files)))

    # 空仓库不能直接创建 blob（HTTP 409）：先落一个占位文件完成初始化，
    # 随后以"无父提交"的方式提交完整文件树并强推该分支，占位提交即成为不可达对象。
    if not api("GET", "repos/%s/git/ref/heads/%s" % (REPO, branch), allow_fail=True):
        info = api("GET", "repos/%s" % REPO, allow_fail=True) or {}
        branch = info.get("default_branch") or branch
        print("仓库为空，先以占位提交初始化（分支 %s）…" % branch)
        api("PUT", "repos/%s/contents/.init" % REPO,
            {"message": "chore: 初始化仓库", "content": base64.b64encode(b"init").decode("ascii")})

    tree = []
    for i, path in enumerate(files, 1):
        with open(path, "rb") as fh:
            raw = fh.read()
        blob = api("POST", "repos/%s/git/blobs" % REPO,
                   {"content": base64.b64encode(raw).decode("ascii"), "encoding": "base64"})
        tree.append({"path": path.replace("\\", "/"), "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print("  [%2d/%d] %-44s %8d B" % (i, len(files), path, len(raw)))

    tree_r = api("POST", "repos/%s/git/trees" % REPO, {"tree": tree})
    # 不显式传 author：由 GitHub 用已认证账号署名（自定义邮箱可能被 API 拒绝，
    # 例如 gitee 的 noreply 地址会触发 422 Validation Failed）
    payload = {"message": message, "tree": tree_r["sha"]}
    if USE_LOCAL_AUTHOR:
        payload["author"] = {"name": author_name, "email": author_email}
    ref = api("GET", "repos/%s/git/ref/heads/%s" % (REPO, branch), allow_fail=True)
    if ref and ref.get("object"):
        payload["parents"] = [ref["object"]["sha"]]
        commit = api("POST", "repos/%s/git/commits" % REPO, payload)
        api("PATCH", "repos/%s/git/refs/heads/%s" % (REPO, branch),
            {"sha": commit["sha"], "force": False})
        print("已更新 %s → %s" % (branch, commit["sha"][:10]))
    else:
        commit = api("POST", "repos/%s/git/commits" % REPO, payload)
        api("PATCH", "repos/%s/git/refs/heads/%s" % (REPO, branch),
            {"sha": commit["sha"], "force": True})
        print("已建立 %s → %s" % (branch, commit["sha"][:10]))
    print("完成：https://github.com/%s" % REPO)


if __name__ == "__main__":
    main()
