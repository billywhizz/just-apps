rkt hacking guide - uses kvmtool
https://github.com/rkt/rkt/blob/171c416fac02516604e48d2e65153dd55a12513e/Documentation/hacking.md

rkt v other projects
https://github.com/rkt/rkt/blob/171c416fac02516604e48d2e65153dd55a12513e/Documentation/rkt-vs-other-projects.md

rkt vs runC
"rkt includes the same functionality as runC but does not expect a user to understand low-level details of the operating system to use, and can be invoked as simply as rkt run coreos.com/etcd,version=v2.2.0"

rkt vs containerd
"rkt has no centralized daemon to manage containers, instead launching containers directly from client commands, making it compatible with init systems such as systemd, upstart, and others."

rkt vs lxc/lxd
"rkt can download, cryptographically verify, and run application container images. It is not designed to run "full system containers" but instead individual applications such as web apps, databases, or caches. As rkt does not have a centralized daemon it can be integrated with init systems such as upstart and systemd."

rkt vs qemu-kvm, lkvm
"The Linux KVM infrastructure is trusted for running multi-tenanted virtual machine infrastructures and is generally accepted as being secure enough to run untrusted system images."

"rkt can optionally use lkvm or qemu-kvm as an additional security measure over a Linux container"

rkt architecture
https://github.com/rkt/rkt/blob/171c416fac02516604e48d2e65153dd55a12513e/Documentation/devel/architecture.md

inspect how rkt works
https://github.com/rkt/rkt/blob/171c416fac02516604e48d2e65153dd55a12513e/Documentation/devel/inspect-containers.md

opencontainers runc
https://github.com/opencontainers/runc

OCI - app container spec
https://github.com/appc/spec


rkt is dead
current alternatives

https://news.ycombinator.com/item?id=22248456

containerd and lxd

podman and crio

dotnet core single file distribution/static link
https://github.com/dotnet/runtime/issues/11201

coreRT
https://github.com/dotnet/corert

single file apps:
https://github.com/dotnet/runtime/issues/36590
https://github.com/dotnet/designs/blob/main/accepted/2020/single-file/design.md


crio
https://cri-o.io/

cri - container runtime interface
https://github.com/kubernetes/community/blob/master/contributors/devel/sig-node/container-runtime-interface.md

podman
https://github.com/containers/podman


OpenRC
https://en.wikipedia.org/wiki/OpenRC

openbsd pledge
http://www.openbsd.org/papers/hackfest2015-pledge/mgp00030.html

nsjail
https://github.com/google/nsjail

sandbox
https://github.com/cloudflare/sandbox

patchelf
https://github.com/NixOS/patchelf