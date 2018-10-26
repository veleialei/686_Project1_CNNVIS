class tsnejscatter {
  constructor($, data, out, graphWidth) {
    this.data = data;
    this.out = out;
    this.graphWidth = parseFloat(graphWidth);

    this.tSNEInstance = this.createTSNE();
  }

  createTSNE() {
    console.log(this.iters);
    this.data = processData(this.data);
    console.log("after processing:" + this.data);
    const graph = this.createD3Graph();

    const opt = {
      epsilon: parseFloat(10),
      perplexity: parseInt(3)
    };
    const tSNEInstance = new tsnejs.tSNE(opt); // create a tSNE instance
    tSNEInstance.initDataRaw(this.data);

    const motion = setInterval(function() {
      iter(this.data, tSNEInstance, graph.xscale, graph.yscale, graph.graphInteract,
        graph.canvas, graph.scatters, graph.xAxis, graph.yAxis);

      if (tSNEInstance.iter > 1000) {
        clearInterval(motion);
      }
    }, 0);

    return tSNEInstance;
  }

  createD3Graph() {
    const margin = {
        top: 0,
        right: 50,
        bottom: 50,
        left: 50
      },
      outerWidth = this.graphWidth,
      outerHeight = this.graphWidth * 0.44,
      width = outerWidth - margin.left - margin.right,
      height = outerHeight - margin.top - margin.bottom,
      xMax = d3.max(this.data, function(d) {
        return d[0];
      }),
      xMin = d3.min(this.data, function(d) {
        return d[0];
      }),
      yMax = d3.max(this.data, function(d) {
        return d[1];
      }),
      yMin = d3.min(this.data, function(d) {
        return d[1];
      }),
      color = d3.scale.category20();

    const xscale = d3.scale.linear().range([0, width]).domain([xMin, xMax]);
    const yscale = d3.scale.linear().range([height, 0]).domain([yMin, yMax]);

    const xAxis = d3.svg.axis()
      .scale(xscale)
      .orient("bottom")
      .tickSize(-height); //x 内线

    const yAxis = d3.svg.axis()
      .scale(yscale)
      .orient("left")
      .tickSize(-width); //y 内线

    const graphInteract = d3.behavior.zoom()
      .x(xscale)
      .y(yscale)
      .scaleExtent([0, 500])

    const canvas = d3.select(this.out)
      .append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(graphInteract);

    //append X and Y axis
    canvas.append("g")
      .classed("x axis", true)
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
      .classed("label", true)
      .attr("x", width)
      .attr("y", margin.bottom - 10)
      .style("text-anchor", "end");

    canvas.append("g")
      .classed("y axis", true)
      .call(yAxis)
      .append("text")
      .classed("label", true)
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + margin.right)
      .attr("dy", ".71em")
      .style("text-anchor", "end");

    // append the circle graph
    const mainGraph = canvas.append("svg")
      .classed("mainGraph", true)
      .attr("width", width)
      .attr("height", height);

    const scatters = mainGraph.selectAll("circle")
      .data(this.data)
      .enter().append("g");

    scatters.append("circle")
      .attr("r", 10)
      .attr("fill", color)
      .attr("opacity", 0.45)
      .attr("stroke", "#fff");

    scatters.append("text")
      .attr("font-size", 10)
      .attr('x', -5.5)
      .attr('y', 3.7)
      .attr("fill", "#000")
      .text(function(d, i) {
        return i;
      });

    graphInteract.on("zoom", function() {
      interact(this.data, canvas, xscale, yscale, xAxis, yAxis, scatters);
    });

    const d3Graph = {
      xscale, yscale, graphInteract, canvas, scatters, xAxis, yAxis
    };

    return d3Graph;
  }
}

const processData = function(data) {
  const lines = data.split("\n"),
    newData = [];

  for (let i = 0; i < lines.length; i++) {
    if (/\S/.test(lines[i])) {
      let elements = lines[i].split(',');
      let point = [];
      for (let j = 0; j < elements.length; j++) {
        point.push(parseFloat(elements[j]));
      }
      newData.push(point);
    }
  }
  return newData;
}

const iter = function(data, tSNEInstance, xscale, yscale, graphInteract, canvas,
  scatters, xAxis, yAxis) {
  let cost = tSNEInstance.step();
  updateD3Graph(tSNEInstance, xscale, yscale, graphInteract, canvas,
    scatters, xAxis, yAxis);
}

const updateD3Graph = function(tSNEInstance, xscale, yscale, graphInteract,
  canvas, scatters, xAxis, yAxis) {
  const data = tSNEInstance.getSolution(),
    enLarge = 1.1,
    xMax = enLarge * d3.max(data, function(d) {
      return d[0];
    }),
    xMin = enLarge * d3.min(data, function(d) {
      return d[0];
    }),
    yMax = enLarge * d3.max(data, function(d) {
      return d[1];
    }),
    yMin = enLarge * d3.min(data, function(d) {
      return d[1];
    });

  xscale.domain([xMin, xMax]);
  yscale.domain([yMin, yMax]);

  scatters
    .attr("d", data)
    .attr("transform", function(d, i) {
      return "translate(" + xscale(data[i][0]) + "," + yscale(data[i][1]) +
        ")";
    });

  graphInteract
    .x(xscale.domain([xMin, xMax])).y(yscale.domain([yMin, yMax]))
    .on("zoom", function() {
      interact(data, canvas, xscale, yscale, xAxis, yAxis, scatters);
    });

  canvas.attr("d", data);
  canvas.select(".x.axis").call(xAxis)
  canvas.select(".y.axis").call(yAxis);
}

const interact = function(data, canvas, xscale, yscale, xAxis, yAxis, scatters) {
  canvas.select(".x.axis").call(xAxis);
  canvas.select(".y.axis").call(yAxis);

  scatters
    .attr("d", data)
    .attr("transform", function(d, i) {
      return "translate(" + xscale(data[i][0]) + "," + yscale(data[i][1]) +
        ")";
    });
}
