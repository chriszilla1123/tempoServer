# <img src="https://raw.githubusercontent.com/chriszilla1123/tempoWeb/master/src/assets/tempo_logo.png" alt="Logo" width="150"/> Tempo Server

- [Try the live web demo!](https://tempoweb.netlify.com/) | [Hosted by Netlify.com](https://www.netlify.com/)
[View source code](https://github.com/chriszilla1123/tempoWeb)

- [Download the Android app on Google Play!](https://play.google.com/store/apps/details?id=net.chilltec.tempo) 
[View source code](https://github.com/chriszilla1123/tempoAndroid)

Test server available at https://www.chilltec.net/api
This is used as the default address in the live web demo and android application, for testing purposes. See the links above.


About
-------
The API server for the Tempo self-hosted music streaming software package, allowing you to scan for local media files and host them through any server. It was written with [Node.JS](https://nodejs.org/en/) and the [Express.JS](https://expressjs.com/) web framework, and uses [SQLite](https://www.sqlite.org/index.html) for efficient, device-portable database management.

Tempo Server serves as the backbone for Tempo, and is a requirement for the Android and Web clients. It should be run on a machine where your media files are stored, preferably one that is open to the internet for remote access.

Installation
-------

- Clone the Github repository - `git clone https://github.com/chriszilla1123/tempoServer`

- Create a `basedir.txt` file containing the base directory for your media files in the form of `/usr/name/music`or `C:\Users\name\music\`

- Ensure that media files are stored in the form of: `Artist/Album/song1.mp3`, `Artist/Album/song2.mp3`, etc.


Requirements
------------

- Any computer capable of acting as a server. For local-only use, this can be any computer. For remote access, look into [port forwarding](https://www.whatismyip.com/port-forwarding/) to allow remote access. Read your router manual for more information.

Recommendations
--------------
These are not strictly required, but recommended for the best experience
* A domain name. This allows the API to be accessed from a memorable URL such as `www.example.com/api`. These can be purchased yearly from a domain name registrar such as [namesilo.com](http://www.namesilo.com) or [namecheap.com](https://www.namecheap.com/)

* A static IP, or a dynamic DNS. You can learn more about setting up a dynamic DNS here: [https://www.duckdns.org/why.jsp](https://www.duckdns.org/why.jsp)


Project by Christopher Hill
