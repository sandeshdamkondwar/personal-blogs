---
title: "Generate a NodeJS Flamechart"
date: 2019-01-11T00:30:48+05:30
draft: false
description: "How to generate a Node.js flame graph using linux perf to diagnose performance bottlenecks."
tags: ["Node.js", "JavaScript", "Performance", "Debugging"]
categories: ["Engineering"]
---


Here’s how you can generate a Node [flame graph](http://www.brendangregg.com/flamegraphs.html)  with linux perf(1). Note that perf(1) needs to run as root, but the perf.map file node generates might be owned by a different user. If that’s the case, you’ll need to change its ownership to root as well — otherwise perf(1) will not be able to use it to translate JS stack frames.

    $ uname -a

Linux demo 3.2.0-74-virtual #109-Ubuntu SMP Tue Dec 9 17:04:48 UTC 2014 x86_64 x86_64 x86_64 GNU/Linux

    $ node --version

v10.16.0

    $ node --perf-basic-prof-only-functions demo.js&

    $ sudo perf record -F 99 -p `pgrep -n node` -g -- sleep 30

[ perf record: Woken up 3 times to write data ]

[ perf record: Captured and wrote 0.531 MB perf.data (~23181 samples) ]

    $ ls /tmp/*.map

/tmp/perf-13083.map

    $ sudo chown root /tmp/perf-13083.map

    $ sudo perf script > nodestacks

Because we’re using perf-basic-prof-only-funcs, there are internal elided frames that are not mapped out, and manifest themselves as [unknown] frames, thus, we strip them out of the nodestacks output.

    $ sed -i '/\[unknown\]/d' nodestacks

    $ git clone --depth 1 https://github.com/sandeshdamkondwar/FlameGraph

    $ cd FlameGraph

    $ ./stackcollapse-perf.pl < ../nodestacks | ./flamegraph.pl --colors js > ../node-flamegraph.svg

This results in a flamegraph that looks like this:

![Screen Shot 2015-11-23 at 1.46.27 PM](https://yunong.files.wordpress.com/2015/11/screen-shot-2015-11-23-at-1-46-27-pm.png?w=748)

One thing to note is that the –perf-basic-prof-only-functions flag results in a perf-<pid>.map artifact under /tmp. This file does grow over time, though at a very limited rate of around 1-2 Mb an hour. This isn’t an issue for us as most of our Node instances are transient, and routinely get killed as part of our autoscaling rules. However, if you have long running Node instances, you may want to consider monitoring the size of this file — truncating or deleting it when appropriate.
