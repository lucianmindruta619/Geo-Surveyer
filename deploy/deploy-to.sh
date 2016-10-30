#!/usr/bin/env bash

if [ "$1" = "" ]
then
  echo "Usage: $0 HOST"
  echo "e.g.: $0 0.tcp.ngrok.io:37899"
else
  type ansible-playbook >/dev/null 2>&1 || {
    echo 'The `ansible-playbook` command is not available, please install Ansible.'
    echo 'You can probably do: `pip install ansible --user` to do that.'
    exit 1
  }
  if [ -e "password" ]
  then
    SUDO=--extra-vars="ansible_become_pass='`cat password`'"
  else
    SUDO=--ask-become-pass
  fi
  HOST=$1
  shift
  ansible-playbook -i $HOST, psutool.yml $SUDO $@
fi
