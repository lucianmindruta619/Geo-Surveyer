all: PotreeConverter/build/PotreeConverter/PotreeConverter server/virtualenv

server/virtualenv:
	virtualenv server/virtualenv
	./update.sh local

PotreeConverter/build/PotreeConverter/PotreeConverter: libLAS/build/bin/Release/liblas.so.3
	./bin/build-potree-converter.sh

libLAS/build/bin/Release/liblas.so.3 libLAS/build/bin/Release/txt2las:
	./bin/build-liblas.sh

clean-potree-converter:
	rm -rf PotreeConverter/build

clean-liblas:
	rm -rf libLAS/build

clean: clean-liblas clean-potree-converter
