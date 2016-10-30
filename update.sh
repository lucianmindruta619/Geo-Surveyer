#!/bin/bash

if [ "$1" == "local" ]
then
	git checkout "$2" &&
	git pull &&
	git submodule init &&
	git submodule update &&
	cd server &&
	. ./virtualenv/bin/activate &&
	pip install -r requirements.txt &&
	./manage.py syncdb &&
	./manage.py migrate &&
	touch site.wsgi
	git log --oneline HEAD@{1}..
else
	case $1 in
	"dev")
		branch="master"
		server="psutool@DONDNA01"
		directory="/home/psutool/psutool/"
		;;
	"live")
		branch="live"
		server="psutool@psu02"
		directory="/var/www/psutool/"
		;;
	esac
	
	if [ "$branch" != "" ]
	then
		echo Updating $server
		ssh -A $server "cd $directory && ./update.sh local $branch"
	else
		echo "Usage: $0 dev|live"
	fi
fi
