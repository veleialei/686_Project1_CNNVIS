const loadInterval = 10;
const visDivide = 10;
const opacityControl = 10;
const widthMinControl = 3;
const widthMaxControl = 12;

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

function trainingInstance() {
    let randomedBatch = loadedBatches[Math.floor(Math.random() * loadedBatches.length)];
    let k = Math.floor(Math.random() * samplesPerBatch);
    let n = randomedBatch * samplesPerBatch + k;
    let isval = n % 10 === 0 ? true : false;
    let x = new convnetjs.Vol(imageDim, imageDim, imageChannels, 0.0);

    for (let dc = 0; dc < imageChannels; dc++) {
        let i = 0;
        for (let xc = 0; xc < imageDim; xc++) {
            for (let yc = 0; yc < imageDim; yc++) {
                let ix = ((imageDim * imageDim * k) + i) * 4 + dc;
                x.set(yc, xc, dc, imgData[randomedBatch].data[ix] / 255.0 - 0.5);
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

    //draw the input layer
    const inputLayer = this.canvas.selectAll("div")
  		.data(this.data["nodeImages"][0])
  		.enter()
  		.append("div")
  		.attr("id", "inputLayer")
  		.style({position: "absolute",
  						top: function(d){return (height/2-d3.select(d).attr("height")/2)+"px";},
  						left: function(d){return (nodeSize-d3.select(d).attr("width")/2)+"px"; }});
  	inputLayer.append(function(d){return d;});

    //hidden layer
  	const layerDiv = this.canvas.selectAll("div.layers")
  		.data(layerData).enter()
  		.append("div")
  		.attr("class", "layers")
  		.attr("id", function(d,i){return "layer_"+(i+1);})
  		.style({
  			position: "absolute",
  			left: function(d,i){return (i+1)*unitWidth+"px";}});

    //each node on hidden layer
  	const filterDiv = layerDiv.selectAll("div.filters")
  		.data(function(d){return d;}).enter()
  		.append("div")
  		.attr("class", "filters")
  		.attr("id", function(d,i){return "filter_"+i;})
  		.style({
  			position: "absolute",
  			top: function(d,i){return (i*nodeSize*2-d3.select(d).attr("width")/2)+"px";},
  			left: function(d){return (nodeSize*4-d3.select(d).attr("height")/2)+"px"}});

  	this.nodeGraph = filterDiv.append("div");

    //draw the output layer
  	const outputData = this.data["nodeImages"][this.data["nodeImages"].length-1];
  	const outputNode = this.canvas.selectAll("div.outputNode")
  		.data(outputData).enter()
  		.append("div")
  		.attr("class", "outputNode")
  		.style({position: "absolute",
  						top: function(d,i){return (i*nodeSize*2 + (height/2 - nodeSize*2*outputData.length/2)-d3.select(d).attr("height")/2 )+"px";},
  						right: function(d,i){return (nodeSize*2-d3.select(d).attr("width")/2)+"px";}});
  	outputNode.append(function(d){return d;});
  }

  drawPaths(){
  	const line = d3.svg.line().x(function(d) { return d.x;}).y(function(d) { return d.y;});
    const pathsData = [];
    const pathWidthControl = {};
    const pathControlDomain = {};
    const pathInensityLength = this.data["pathIntensity"].length;

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
      			}else if(layerIndex == pathInensityLength-2){
      				pathObject["x"] = width-nodeSize;
      				pathObject["y"] = (pathIndex*nodeSize*2 + (height/2 - nodeSize*2*filter.length/2));
      			}else{
      				pathObject["x"] = unitWidth*(layerIndex+1) + nodeSize*4;
      				pathObject["y"] = pathIndex*nodeSize*2;
      			}

            //line intensity
      			if(layerIndex != pathInensityLength-1){
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

    for(let key in pathControlDomain){
      let scale = d3.scale.linear().domain(d3.extent(pathControlDomain[key])).range([widthMinControl, widthMaxControl]);
      pathWidthControl[key] = scale;
    }
      this.svg.selectAll("path")
      	.data(pathsData).enter()
      	.append("path")
      	.attr("d", line)
        .style("stroke","orange")
  			.style("stroke-width", function(d){
        	return pathWidthControl[d[0]["layer"]](d[0]["pathIntensity"]);
        })
      	.style("opacity", function(d){
          // return pathWidthControl[d[0]["layer"]](d[0]["pathIntensity"])/12;
      		let intensityScale = pathControlDomain[d[0]["layer"]].sort();
      		if(d[0]["layer"]==0) return 0.4;
      		if(intensityScale.indexOf(d[0]["pathIntensity"]) < intensityScale.length/opacityControl){
      			return 0;
      		}
      		return 0.4;
      	});
  }

  drawNode (){
  	let nodes = [];
  	this.nodeGraph.each(function(d){
  		nodes.push(d3.select(this).append(function(d){return d;}));
  	});
  }

  removeGraphs (){
    this.canvas.selectAll("div#inputLayer").remove();
  	this.canvas.selectAll("div.outputNode").remove();
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
