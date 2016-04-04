#!/usr/bin/env bash

# ----- Aptitude Installs ----- #

# Update package list.
echo '-----> Updating package list...'
sudo apt-get update

# Add node repo and install.
echo '-----> Installing Node.js...'
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs


# ---- Configure Systemd ----- #

echo '-----> Configuring Systemd...'

# Replace paths to working directory.
WORKING_DIR=$(pwd)
WORKING_DIR_ESC="${WORKING_DIR//\//\\/}"
sed "s/\/home\/pi\/music-server/$WORKING_DIR_ESC/g" music-server.service > /etc/systemd/system/music-server.service

# Enable and start the service.
sudo systemctl enable /etc/systemd/system/music-server.service
sudo systemctl start music-server.service
