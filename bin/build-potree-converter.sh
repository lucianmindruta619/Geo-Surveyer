#!/bin/bash

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR
cd ..

cd PotreeConverter && mkdir -p build && cd build && cmake .. -DLIBLAS_INCLUDE_DIR=../../libLAS/include/ -DLIBLAS_LIBRARY=../../libLAS/build/bin/Release/liblas.so.3 && make
