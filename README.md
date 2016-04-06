# Music

A web-based, network music player, built on Node.js. Requires node to be installed.

## Raspberry Pi Install Script

First, make sure node is installed on your system. For the Raspberry Pi 2 (armv7) and above, the Node.js project makes this available via [NodeSource](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions). For the Raspberry Pi 1 (armv6), [nvm](https://github.com/creationix/nvm) (the Node Version Manager) is a handy tool.

Once you have node installed, download the repo and:

```
sudo ./setup.sh
```

then navigate to `<pi_ip_address>:3000` in a browser.

## Install Development

Download the repo and:

```
npm install
```

### Run

```
npm start
```

and navigate to `<host_ip_address>:3000` in a browser.
