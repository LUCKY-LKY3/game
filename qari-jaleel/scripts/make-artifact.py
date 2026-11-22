#!/usr/bin/env python3
"""Package qari-jaleel/dist into /tmp/qj-artifact for publishing as a single-page Artifact.

Run after `npx vite build`. Prints the new JS filename to publish.
The Artifact page wraps our HTML itself, so index.html has no doctype/head/body.
"""
import glob
import os
import re
import shutil

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.join(root, "dist")
out = "/tmp/qj-artifact"

shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)
shutil.copytree(os.path.join(dist, "assets"), os.path.join(out, "assets"))
if os.path.isdir(os.path.join(dist, "src")):
    shutil.copytree(os.path.join(dist, "src"), os.path.join(out, "src"))

js = glob.glob(os.path.join(out, "assets", "*.js"))[0]
css = glob.glob(os.path.join(out, "assets", "*.css"))[0]

# Image paths are root-relative in the code; the Artifact serves files next to the page.
code = open(js).read()
code = re.sub(r"([\"'`])/src/assets/", r"\1src/assets/", code)
open(js, "w").write(code)

html = f"""<title>Mafia Bhayas</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">
<style>html,body{{margin:0;height:100%;background:#141210;color:#F8F4EC;overscroll-behavior:none}}
{open(css).read()}</style>
<div id="root"></div>
<script>document.body.className="bg-[#141210] text-[#F8F4EC] antialiased";</script>
<script type="module" src="assets/{os.path.basename(js)}"></script>
"""
open(os.path.join(out, "index.html"), "w").write(html)
print("publish file_path=/tmp/qj-artifact/index.html root=/tmp/qj-artifact")
print("new JS:", "assets/" + os.path.basename(js))
