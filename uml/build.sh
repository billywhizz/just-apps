#!/bin/bash
#cd app
#just build init.js --clean --static
#sudo cp init ../initramfs/
#sudo cp app.js ../initramfs/
#cd ..
#make -j 4 -C linux-5.6.9 ARCH=um
#cp linux-5.6.9/linux ./
#sudo setcap cap_net_raw,cap_net_admin+ep linux
#sudo setcap CAP_MKNOD=ep linux
cat linux-5.6.9/.config | grep -v "#" | sort | uniq > linux.config
just build build.js --clean --static --cleanall
sudo setcap CAP_MKNOD=ep build
