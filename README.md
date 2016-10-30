Online tool for reading land surveyor plot data and turning it into DXF CAD files with intelligence and a 3d interface for modifying the data on the way through. Original data comes from robotic lazer theodolite and gets written to ASCII files with p/s/u extension. Users can upload plot data in raw form, visualise it, modify it, and then export the DXF format output for use in a CAD program.

Install
-------

Install the local dependencies as follows:

 * Install virtualenv with `pip install virtualenv`
 * Checkout the project with `git clone REPOSITORY-URL --recursive`
 * Get into the virtualenv environment with `. ./virtualenv/bin/activate`
 * Install the Python library dependencies with `pip install -r server/requirements.txt`
 * `make`

Run
---

Launch the server as follows:

 * Get into the virtualenv environment with `. ./virtualenv/bin/activate`
 * Launch the server with `./server/manage.py runserver`
 * Browse to <http://localhost:8000/>

Useful stuff
------------

 * [three.js Documentation](http://threejs.org/docs/)
 * [AutoCad 2000 DXF Reference](http://www.autodesk.com/techpubs/autocad/acad2000/dxf/)
 * [Python DXF writing library](http://pythonhosted.org/dxfwrite/index.html)

