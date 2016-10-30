#!/bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR
cd ..

cd libLAS && mkdir -p build && cd build && cmake .. && make
