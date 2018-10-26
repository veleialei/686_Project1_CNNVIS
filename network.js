const loadInterval = 10;
const visDivide = 30;

const nodeSize  = 30;
const height = 630;
const width = 1390;
const unitWidth = (width-nodeSize*4)/11;

const batches = 50;
const samplesPerBatch = 1000;
const imageDim = 32;
const imageChannels = 3;
const timeOut = 200;
const imgElts = new Array(batches);
const imgData = new Array(batches);
const loaded = new Array(batches); //if the data in arr is loaded
const loadedBatches = [];
const maxmin = cnnutil.maxmin;

//from the orignal code
const htmlContent = "layerDefs = [];\n\
layerDefs.push({type:'input', out_sx:32, out_sy:32, out_depth:3});\n\
layerDefs.push({type:'conv', sx:5, filters:3, stride:1, pad:2, activation:'relu'});\n\
layerDefs.push({type:'pool', sx:2, stride:2});\n\
layerDefs.push({type:'conv', sx:5, filters:4, stride:1, pad:2, activation:'relu'});\n\
layerDefs.push({type:'pool', sx:2, stride:2});\n\
layerDefs.push({type:'conv', sx:5, filters:5, stride:1, pad:2, activation:'relu'});\n\
layerDefs.push({type:'pool', sx:2, stride:2});\n\
layerDefs.push({type:'softmax', num_classes:10});\n\
\n\
convnet = new convnetjs.Net();\n\
convnet.makeLayers(layerDefs);\n\
\n\
trainer = new convnetjs.SGDTrainer(convnet, {method:'adadgrad', batch_size:4, l2_decay:0.0001});\n\
";
let stepNum = 0;
let layerDefs, convnet, trainer;
let data = {};

//from the orignal code
$(window).load(function() {
    $("#netData").val(htmlContent);
    eval($("#netData").val());

    for (let k = 0; k < loaded.length; k++) {
        loaded[k] = false;
    }

    loadData(0); // async load train set batch 0
    loadData(batches); // async load test set
    run();
});

function run() {
    if (loaded[0] && loaded[batches]) {
        console.log('running!');
        setInterval(loadSample, loadInterval); // lets go!
    } else {
        setTimeout(run, timeOut);
    }
}

function loadData(batchId) {
    let imgElt = new Image();
    imgElts[batchId] = imgElt;
    imgElt.onload = function() {
        let dataCanvas = document.createElement('canvas');
        let data2D = dataCanvas.getContext("2d");

        dataCanvas.width = imgElt.width;
        dataCanvas.height = imgElt.height;

        data2D.drawImage(imgElt, 0, 0);
        imgData[batchId] = data2D.getImageData(0, 0, imgElt.width, imgElt.height);
        loaded[batchId] = true;
        if (batchId < batches) {
            loadedBatches.push(batchId);
        }
    };
    imgElt.src = "cifar10/cifar10_batch_" + batchId + ".png";
}

//their code
function trainingInstance() {
    let bi = Math.floor(Math.random() * loadedBatches.length);
    let b = loadedBatches[bi];
    let k = Math.floor(Math.random() * samplesPerBatch); // sample within the batch
    let n = b * samplesPerBatch + k;
    let isval = n % 10 === 0 ? true : false;

    let p = imgData[b].data;
    let x = new convnetjs.Vol(imageDim, imageDim, imageChannels, 0.0);
    let W = imageDim * imageDim;

    // fetch the appropriate row of the training image and reshape into a Vol
    for (let dc = 0; dc < imageChannels; dc++) {
        let i = 0;
        for (let xc = 0; xc < imageDim; xc++) {
            for (let yc = 0; yc < imageDim; yc++) {
                let ix = ((W * k) + i) * 4 + dc;
                x.set(yc, xc, dc, p[ix] / 255.0 - 0.5);
                i++;
            }
        }
    }

    return {
        x: x,
        label: labels[n],
        isval: isval
    };
}

function loadSample() {
    const trained_sample = trainingInstance();
    iter(trained_sample);
}

function iter(sample) {
    let x = sample.x;
    let y = sample.label;

    // train on it with network keep track of stats such as the average training error and loss
    trainer.train(x, y);
    convnet.getPrediction();

    // Neural Net Vis //
    if (stepNum % visDivide === 0) {
        let ae = new graphInstance();
        if (stepNum === 0) {
            window.nnv = new CNNVis("#cnnVis", ae.layerData);
        } else {
            window.nnv.update(ae.layerData);
        }
    }
    stepNum++;
}

function graphInstance() {
    let layerSize = convnet.layers.length - 1;
    this.layerData = {};
    this.layerData["nodeImages"] = [];
    this.layerData["pathIntensity"] = [];

    for (let i = 0; i < layerSize; i++) {
        let imgArray = [];
        let layer = convnet.layers[i];
        let elementSize = get_number_of_elements_in_layer(layer);

        for (let j = 0; j < elementSize; j++) {
            let canvasImg = get_canvas_img(layer, j);
            imgArray.push(canvasImg);
        }
        this.layerData["nodeImages"].push(imgArray);
    }

    // get_path_intensity run
    for (let i = 0; i < layerSize; i++) {
        let L1 = convnet.layers[i];
        let L2 = convnet.layers[i + 1];

        let elementSize = get_number_of_elements_in_layer(L1);
        let pathIntensity = [];
        for (let j = 0; j < elementSize; j++) {
            let gradMag = get_path_intensity(L1, L2, j);
            pathIntensity.push(gradMag);
        }
        this.layerData["pathIntensity"].push(pathIntensity);
    }
}

//class
function CNNVis(canvas, data){
	let _self = this;
	_self.data = data;
	console.log(data);
	_self.jqueryCanvas = $(canvas);
	_self.canvas = d3.select(canvas);
  d3.select(canvas).style("position", "relative");

	_self.nodeGraph = [];
	_self.svg = _self.canvas.append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("class", "svg_path");

	_self.drawLayers();
	_self.drawPaths();
	_self.drawNode();
}

CNNVis.prototype.drawLayers = function(){
	let _self = this;

	const layerData = _self.data["nodeImages"].slice(1, _self.data["nodeImages"].length-1);
	const beginNode = _self.canvas.selectAll("div")
		.data(_self.data["nodeImages"][0])
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

	const endData = _self.data["nodeImages"][_self.data["nodeImages"].length-1];
	const endNode = _self.canvas.selectAll("div.endNode")
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

	const layerDiv = _self.canvas.selectAll("div.layers")
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

	_self.nodeGraph = filterDiv.append("div");
}

CNNVis.prototype.drawPaths = function(){
	let _self = this;

	const line = d3.svg.line().x(function(d) { return d.x;}).y(function(d) { return d.y;});
  const pathsData = [];
  const pathControlDomain = {};

  _self.data["pathIntensity"].forEach(function(layer, layerIndex){
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
    			}else if(layerIndex == _self.data["pathIntensity"].length-2){
    				pathObject["x"] = width-nodeSize;
    				pathObject["y"] = (pathIndex*nodeSize*2 + (height/2 - nodeSize*2*filter.length/2));
    			}else{
    				pathObject["x"] = unitWidth*(layerIndex+1) + nodeSize*4;
    				pathObject["y"] = pathIndex*nodeSize*2;
    			}

          //line intensity
    			if(layerIndex != _self.data["pathIntensity"].length-1){
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
    _self.svg.selectAll("path")
    	.data(pathsData).enter()
    	.append("path")
    	.attr("d", line)
      .style("stroke","#FFA500")
			.style("stroke-width", function(d){
      	return 0.8*pathWidthControl[d[0]["layer"]](d[0]["pathIntensity"]);
      })
    	.style("opacity", function(d){
    		let intensityScale = pathControlDomain[d[0]["layer"]].sort();
    		if(d[0]["layer"]==0){
    			return 0.4;
    		}
    		if(intensityScale.indexOf(d[0]["pathIntensity"]) < intensityScale.length/2){
    			return 0;
    		}else{
    			return 0.4;
    		}
    	});
}

CNNVis.prototype.drawNode = function(){
	let _self = this;
	let nodes = [];
	_self.nodeGraph.each(function(d){
		nodes.push(d3.select(this).append(function(d){return d;}));
	});
}

CNNVis.prototype.removeGraphs = function(){
	let _self = this;
	_self.canvas.selectAll("div#beginNode").remove();
	_self.canvas.selectAll("div.endNode").remove();
	_self.canvas.selectAll("div.layers").remove();
  _self.svg.selectAll("path").remove();
}

CNNVis.prototype.update = function(data){
	let _self = this;
	_self.data = data;
	_self.removeGraphs();
	_self.drawLayers();
	$('div.layers').prependTo(_self.jqueryCanvas);
	_self.drawNode();
	_self.drawPaths();
}
