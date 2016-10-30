#!/bin/bash

case $2 in
#"blah")
#	server="psutool@exchange.donovanassociates.com.au"
#	directory="/var/www/mccormickit.com/clients/yeffect/psutool/server/PSUTool/media/uploaded/"
#	;;
"dev")
	server="mccormickit.com"
	directory="/var/www/psutool/server/PSUTool/media/uploaded/"
	;;
*)
	server="psutool@psu02"
	directory="/var/www/psutool/server/PSUTool/media/uploaded/"
	;;
esac

if [ "$1" == "" ]
then
	echo Usage: $0 JOBNUMBER '[dev/live]'
else
	rsync -az --progress $server:$directory$1/ server/PSUTool/media/uploaded/$1
fi
