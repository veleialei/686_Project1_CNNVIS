class CNNVis {
  constructor(canvas, data){
  	this.data = data;
  	console.log(data);
  	this.jqueryCanvas = $(canvas);
  	this.canvas = d3.select(canvas);
  	this.nodeGraph = [];
  	d3.select(canvas).style("position", "relative");
  	this.svg = this.canvas.append("svg")
  		.attr("width", width)
  		.attr("height", height)
  		.append("g")
  		.attr("class", "svg_path");

  	this.drawLayers();
  	this.drawPaths();
  	this.drawNode();
  }

  drawLayers(){
  	const layerData = this.data["nodeImages"].slice(1, this.data["nodeImages"].length-1);
  	const beginNode = this.canvas.selectAll("div")
  		.data(this.data["nodeImages"][0])
  		.enter()
  		.append("div")
  		.attr("id", "beginNode")
  		.style({width: nodeSize,
  						height: nodeSize,
  						"vertical-align": "middle",
  						position: "absolute",
  						top: function(d){return (height/2-d3.select(d).attr("height")/2)+"px";},
  						left: function(d){return (nodeSize-d3.select(d).attr("width")/2)+"px"; }});
  	beginNode.append(function(d){return d;});

  	const endData = this.data["nodeImages"][this.data["nodeImages"].length-1];
  	const endNode = this.canvas.selectAll("div.endNode")
  		.data(endData).enter()
  		.append("div")
  		.attr("class", "endNode")
  		.style({width: nodeSize,
  						height: nodeSize,
  						"vertical-align": "middle",
  						position: "absolute",
  						top: function(d,i){return (i*nodeSize*2 + (height/2 - nodeSize*2*endData.length/2)-d3.select(d).attr("height")/2 )+"px";},
  						right: function(d,i){return (nodeSize*2-d3.select(d).attr("width")/2)+"px";}});
  	endNode.append(function(d){return d;});

  	const layerDiv = this.canvas.selectAll("div.layers")
  		.data(layerData).enter()
  		.append("div")
  		.attr("class", "layers")
  		.attr("id", function(d,i){return "layer_"+(i+1);})
  		.style({width: nodeSize,
  			height: nodeSize,
  			"vertical-align": "middle",
  			position: "absolute",
  			left: function(d,i){return (i+1)*unitWidth+"px";}});

  	const filterDiv = layerDiv.selectAll("div.filters")
  		.data(function(d){return d;}).enter()
  		.append("div")
  		.attr("class", "filters")
  		.attr("id", function(d,i){return "filter_"+i;})
  		.style({width: nodeSize,
  			height: nodeSize,
  			"vertical-align": "middle",
  			position: "absolute",
  			top: function(d,i){return (i*nodeSize*2-d3.select(d).attr("width")/2)+"px";},
  			left: function(d){return (nodeSize*4-d3.select(d).attr("height")/2)+"px"}});

  	this.nodeGraph = filterDiv.append("div");
  }

  drawPaths(){
  	const line = d3.svg.line().x(function(d) { return d.x;}).y(function(d) { return d.y;});
    const pathsData = [];
    const pathControlDomain = {};

    this.data["pathIntensity"].forEach(function(layer, layerIndex){
      	layer.forEach(function(filter, filterIndex){
      		let obj = {}
  				if(layerIndex != 0){
  					obj["x"] = unitWidth*layerIndex + nodeSize*4;
      			obj["y"] = filterIndex*nodeSize*2;
      		}else{
  					obj["x"] = nodeSize;
  					obj["y"] = height/2;
      		}
      		filter.forEach(function(path, pathIndex){
      			let pathObject = {};
            //line x, y
      			if(layerIndex==0){
      				pathObject["x"] = unitWidth*(layerIndex+1) + nodeSize*4;
      				pathObject["y"] = pathIndex*nodeSize*2;
      			}else if(layerIndex == this.data["pathIntensity"].length-2){
      				pathObject["x"] = width-nodeSize;
      				pathObject["y"] = (pathIndex*nodeSize*2 + (height/2 - nodeSize*2*filter.length/2));
      			}else{
      				pathObject["x"] = unitWidth*(layerIndex+1) + nodeSize*4;
      				pathObject["y"] = pathIndex*nodeSize*2;
      			}

            //line intensity
      			if(layerIndex != this.data["pathIntensity"].length-1){
      				obj["layer"] = layerIndex;
      				pathObject["layer"] = layerIndex;
      				if(pathControlDomain[layerIndex]==undefined){
      					pathControlDomain[layerIndex]=[path];
      				}else{
      					pathControlDomain[layerIndex].push(path)
      				}
      				obj["pathIntensity"] = path;
      				pathObject["pathIntensity"] = path;
      				pathsData.push([obj, pathObject]);
      			}
      		})
      	})
      });

    let pathWidthControl = {};
    for(let key in pathControlDomain){
      let scale = d3.scale.linear().domain(d3.extent(pathControlDomain[key])).range([5, 25]);
      pathWidthControl[key] = scale;
    }
      this.svg.selectAll("path")
      	.data(pathsData).enter()
      	.append("path")
      	.attr("d", line)
        .style("stroke","blue")
  			.style("stroke-width", function(d){
        	return 0.8*pathWidthControl[d[0]["layer"]](d[0]["pathIntensity"]);
        })
      	.style("opacity", function(d){
      		let intensityScale = pathControlDomain[d[0]["layer"]].sort();
      		if(d[0]["layer"]==0){
      			return .5;
      		}
      		if(intensityScale.indexOf(d[0]["pathIntensity"]) < intensityScale.length/2){
      			return 0;
      		}else{
      			return .5;
      		}
      	});
  }

  drawNode (){
  	let nodes = [];
  	this.nodeGraph.each(function(d){
  		nodes.push(d3.select(this).append(function(d){return d;}));
  	});
  }

  removeGraphs (){
    this.canvas.selectAll("div#beginNode").remove();
  	this.canvas.selectAll("div.endNode").remove();
  	this.canvas.selectAll("div.layers").remove();
    this.svg.selectAll("path").remove();
  }

  update (data){
  	this.data = data;
  	this.removeGraphs();
  	this.drawLayers();
  	$('div.layers').prependTo(this.jqueryCanvas);
  	this.drawNode();
  	this.drawPaths();
  }
}
