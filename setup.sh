#!/usr/bin/env bash
. ~/.nvm/nvm.sh


# ----- Install Dependencies ----- #

# Add node repo and install.
echo '-----> Installing dependencies...'
npm install


# ----- Configure Systemd ----- #

echo '-----> Configuring Systemd...'

# Replace paths to working directory.
WORKING_DIR=$(pwd)
WORKING_DIR_ESC="${WORKING_DIR//\//\\/}"
sed "s/\/home\/pi\/music-server/$WORKING_DIR_ESC/g" music-server.service > /etc/systemd/system/music-server.service

# Enable and start the service.
sudo systemctl enable /etc/systemd/system/music-server.service
sudo systemctl start music-server.service
