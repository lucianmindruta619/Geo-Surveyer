from dxfwrite import DXFEngine as dxf

drawing = dxf.drawing('dxfwrite-python-test.dxf')
drawing.add_layer('contours')

polyline= dxf.polyline(layer="contours")
polyline.add_vertices( [(0,20), (3,20), (6,23), (9,23)])
drawing.add(polyline)

polyline = dxf.polyline(layer="contours")
polyline.add_vertices( [(0,30), (3,30), (6,33), (9,33)])
drawing.add(polyline)

drawing.save()
