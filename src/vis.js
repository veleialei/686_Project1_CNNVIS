// contains various utility functions
var cnnvis = (function(exports){

  // can be used to graph loss, or accuract over time
  var Graph = function(options) {
    var options = options || {};
    this.step_horizon = options.step_horizon || 1000;

    this.pts = [];

    this.maxy = -9999;
    this.miny = 9999;
  }

  Graph.prototype = {
    // canv is the canvas we wish to update with this new datapoint
    add: function(step, y) {
      var time = new Date().getTime(); // in ms
      if(y>this.maxy*0.99) this.maxy = y*1.05;
      if(y<this.miny*1.01) this.miny = y*0.95;

      this.pts.push({step: step, time: time, y: y});
      if(step > this.step_horizon) this.step_horizon *= 2;
    },
    // elt is a canvas we wish to draw into
    drawSelf: function(canv) {

      var pad = 25;
      var H = canv.height;
      var W = canv.width;
      var ctx = canv.getContext('2d');

      ctx.clearRect(0, 0, W, H);
      ctx.font="10px Georgia";

      var f2t = function(x) {
        var dd = 1.0 * Math.pow(10, 2);
        return '' + Math.floor(x*dd)/dd;
      }

      // draw guidelines and values
      ctx.strokeStyle = "#999";
      ctx.beginPath();
      var ng = 10;
      for(var i=0;i<=ng;i++) {
        var xpos = i/ng*(W-2*pad)+pad;
        ctx.moveTo(xpos, pad);
        ctx.lineTo(xpos, H-pad);
        ctx.fillText(f2t(i/ng*this.step_horizon/1000)+'k',xpos,H-pad+14);
      }
      for(var i=0;i<=ng;i++) {
        var ypos = i/ng*(H-2*pad)+pad;
        ctx.moveTo(pad, ypos);
        ctx.lineTo(W-pad, ypos);
        ctx.fillText(f2t((ng-i)/ng*(this.maxy-this.miny) + this.miny), 0, ypos);
      }
      ctx.stroke();

      var N = this.pts.length;
      if(N<2) return;

      // draw the actual curve
      var t = function(x, y, s) {
        var tx = x / s.step_horizon * (W-pad*2) + pad;
        var ty = H - ((y-s.miny) / (s.maxy-s.miny) * (H-pad*2) + pad);
        return {tx:tx, ty:ty}
      }

      ctx.strokeStyle = "red";
      ctx.beginPath()
      for(var i=0;i<N;i++) {
        // draw line from i-1 to i
        var p = this.pts[i];
        var pt = t(p.step, p.y, this);
        if(i===0) ctx.moveTo(pt.tx, pt.ty);
        else ctx.lineTo(pt.tx, pt.ty);
      }
      ctx.stroke();
    }
  }

  // same as graph but draws multiple lines. For now I'm lazy and duplicating
  // the code, but in future I will merge these two more nicely.
  var MultiGraph = function(legend, options) {
    var options = options || {};
    this.step_horizon = options.step_horizon || 1000;

    if(typeof options.maxy !== 'undefined') this.maxy_forced = options.maxy;
    if(typeof options.miny !== 'undefined') this.miny_forced = options.miny;

    this.pts = [];

    this.maxy = -9999;
    this.miny = 9999;
    this.numlines = 0;

    this.numlines = legend.length;
    this.legend = legend;
    this.styles = ["red", "blue", "green", "black", "magenta", "cyan", "purple", "aqua", "olive", "lime", "navy"];
    // 17 basic colors: aqua, black, blue, fuchsia, gray, green, lime, maroon, navy, olive, orange, purple, red, silver, teal, white, and yellow
  }

  MultiGraph.prototype = {
    // canv is the canvas we wish to update with this new datapoint
    add: function(step, yl) {
      var time = new Date().getTime(); // in ms
      var n = yl.length;
      for(var k=0;k<n;k++) {
        var y = yl[k];
        if(y>this.maxy*0.99) this.maxy = y*1.05;
        if(y<this.miny*1.01) this.miny = y*0.95;
      }

      if(typeof this.maxy_forced !== 'undefined') this.maxy = this.maxy_forced;
      if(typeof this.miny_forced !== 'undefined') this.miny = this.miny_forced;

      this.pts.push({step: step, time: time, yl: yl});
      if(step > this.step_horizon) this.step_horizon *= 2;
    },
    // elt is a canvas we wish to draw into
    drawSelf: function(canv) {

      var pad = 25;
      var H = canv.height;
      var W = canv.width;
      var ctx = canv.getContext('2d');

      ctx.clearRect(0, 0, W, H);
      ctx.font="10px Georgia";

      var f2t = function(x) {
        var dd = 1.0 * Math.pow(10, 2);
        return '' + Math.floor(x*dd)/dd;
      }

      // draw guidelines and values
      ctx.strokeStyle = "#999";
      ctx.beginPath();
      var ng = 10;
      for(var i=0;i<=ng;i++) {
        var xpos = i/ng*(W-2*pad)+pad;
        ctx.moveTo(xpos, pad);
        ctx.lineTo(xpos, H-pad);
        ctx.fillText(f2t(i/ng*this.step_horizon/1000)+'k',xpos,H-pad+14);
      }
      for(var i=0;i<=ng;i++) {
        var ypos = i/ng*(H-2*pad)+pad;
        ctx.moveTo(pad, ypos);
        ctx.lineTo(W-pad, ypos);
        ctx.fillText(f2t((ng-i)/ng*(this.maxy-this.miny) + this.miny), 0, ypos);
      }
      ctx.stroke();

      var N = this.pts.length;
      if(N<2) return;

      // draw legend
      for(var k=0;k<this.numlines;k++) {
        ctx.fillStyle = this.styles[k % this.styles.length];
        ctx.fillText(this.legend[k], W-pad-100, pad+20+k*16);
      }
      ctx.fillStyle = "black";

      // draw the actual curve
      var t = function(x, y, s) {
        var tx = x / s.step_horizon * (W-pad*2) + pad;
        var ty = H - ((y-s.miny) / (s.maxy-s.miny) * (H-pad*2) + pad);
        return {tx:tx, ty:ty}
      }
      for(var k=0;k<this.numlines;k++) {

        ctx.strokeStyle = this.styles[k % this.styles.length];
        ctx.beginPath()
        for(var i=0;i<N;i++) {
          // draw line from i-1 to i
          var p = this.pts[i];
          var pt = t(p.step, p.yl[k], this);
          if(i===0) ctx.moveTo(pt.tx, pt.ty);
          else ctx.lineTo(pt.tx, pt.ty);
        }
        ctx.stroke();
      }

    }
  }

  exports = exports || {};
  exports.Graph = Graph;
  exports.MultiGraph = MultiGraph;
  return exports;

})(typeof module != 'undefined' && module.exports);  // add exports to module.exports if in node.js


var get_layer_canvas = function(L, isFilter, grads, index, scale) {
  var A = {};
  if(isFilter) {
    A = L.filters[index];
  } else {
    A = L.out_act;
  }

  var isColor = false;
  if(A.depth == 3) { isColor = true; }

  var s = scale || 2; // scale
  if(isFilter) s = 4;

  var draw_grads = false;
  if(typeof(grads) !== 'undefined') draw_grads = grads;

  // get max and min activation to scale the maps automatically
  var w = draw_grads ? A.dw : A.w;
  var mm = maxmin(w);

  var canv = document.createElement('canvas');
  canv.className = 'actmap';
  var W = A.sx * s;
  var H = A.sy * s;
  canv.width = W;
  canv.height = H;
  var ctx = canv.getContext('2d');
  var g = ctx.createImageData(W, H);

  if(isColor) { // draw a color img
    for(var d=0;d<3;d++) {
      for(var x=0;x<A.sx;x++) {
        for(var y=0;y<A.sy;y++) {
          if(draw_grads) {
            var dval = Math.floor((A.get_grad(x,y,d)-mm.minv)/mm.dv*255);
          } else {
            var dval = Math.floor((A.get(x,y,d)-mm.minv)/mm.dv*255);
          }
          for(var dx=0;dx<s;dx++) {
            for(var dy=0;dy<s;dy++) {
              var pp = ((W * (y*s+dy)) + (dx + x*s)) * 4;
              g.data[pp + d] = dval;
              if(d===0) g.data[pp+3] = 255; // alpha channel
            }
          }
        }
      }
    }
  }
  else { //draw a black & white img

    if(isFilter) {
      for(var x=0;x<A.sx;x++) {
        for(var y=0;y<A.sy;y++) {
          var dval = 0
          //calculate average of the filter weights
          for(var d=0;d<A.depth;d++) {
            if(draw_grads) {
              dval += Math.floor((A.get_grad(x,y,d)-mm.minv)/mm.dv*255);
            } else {
              dval += Math.floor((A.get(x,y,d)-mm.minv)/mm.dv*255);
            }
          }
          dval = dval/A.depth;
          for(var dx=0;dx<s;dx++) {
            for(var dy=0;dy<s;dy++) {
              var pp = ((W * (y*s+dy)) + (dx + x*s)) * 4;
              for(var i=0;i<3;i++) { g.data[pp + i] = dval; } // rgb
              g.data[pp+3] = 255; // alpha channel
            }
          }
        }
      }
    } else {

      var d = index;

      for(var x=0;x<A.sx;x++) {
        for(var y=0;y<A.sy;y++) {
          if(draw_grads) {
            var dval = Math.floor((A.get_grad(x,y,d)-mm.minv)/mm.dv*255);
          } else {
            var dval = Math.floor((A.get(x,y,d)-mm.minv)/mm.dv*255);
          }
          for(var dx=0;dx<s;dx++) {
            for(var dy=0;dy<s;dy++) {
              var pp = ((W * (y*s+dy)) + (dx + x*s)) * 4;
              for(var i=0;i<3;i++) { g.data[pp + i] = dval; } // rgb
              g.data[pp+3] = 255; // alpha channel
            }
          }
        }
      }
    } //else end
  } //else end

  ctx.putImageData(g, 0, 0);
  return canv;
}

var get_canvas_img = function(L, index) {

  // var get_layer_canvas = function(L, isFilter, grads, index, 2) {
  if(L.layer_type == 'conv') {
    return get_layer_canvas(L, true, false, index, 2);
  }
  else if(L.layer_type == 'relu') {
    return get_layer_canvas(L, false, false, index, 2);
  }
  else if(L.layer_type == 'pool') {
    return get_layer_canvas(L, false, false, index, 2);
  }
  else if(L.layer_type == 'softmax') {
    return get_layer_canvas(L, false, false, index, 10);
  }
  else if(L.layer_type == 'fc') {
    return get_layer_canvas(L, false, false, index, 10);
  }
  else if(L.layer_type == 'input') {
    return get_layer_canvas(L, false, false, index, 2);
  }
  else {
    console.log('Invalid layer');
  }

}

var get_number_of_elements_in_layer = function(L) {

  if(L.layer_type == 'conv') {
      return L.filters.length;
  }
  else {
    if(L.layer_type == 'input')
      return 1;
    else
      return L.out_act.depth;
  }
}

var get_grad_magnitude = function(L, index){

  var isFilter = true;

  var A = {};
  if(isFilter) {
    A = L.filters[index];
  } else {
    A = L.out_act;
  }
  var grad_magnitude = 0.0;
  var area = A.sx * A.sy * A.depth;
    for(var d=0;d<A.depth ; d++) {
      for(var x=0;x<A.sx;x++) {
        for(var y=0;y<A.sy;y++) {
          var A_grad=A.get_grad(x,y,d);
          grad_magnitude+=A_grad*A_grad;
        }
      }
    }

  return grad_magnitude * 200 / area;
}

var get_path_intensity = function(L1, L2, index){
  var isFilter = false;

  if(L1.layer_type == 'conv') {
    isFilter = true;
  }

  var A = {};
  if(isFilter) {
    A = L1.filters[index];
  } else {
    A = L1.out_act;
  }
  var path_intensity = 0.0;
  var area = A.sx * A.sy / 100;

  if(isFilter) {
    for(var d=0;d<A.depth ; d++) {
      for(var x=0;x<A.sx;x++) {
        for(var y=0;y<A.sy;y++) {
          var act=A.get(x,y,d);
          if(act < 0) act = -1 * act;
          path_intensity+=act;
        }
      }
    }
  } else {
     if(L1.layer_type == 'pool' && (L2.layer_type == 'conv' || L2.layer_type == 'fc')) {
      var num_out = get_number_of_elements_in_layer(L2);
      var path_arr = [];
      for(var i=0; i<num_out; i++) {

        path_intensity = 0.0;
        stride = L2.stride;
        var d = index;
        var B = L2.filters[i];
        for(var x=0;x<A.sx;x+=stride) {
          for(var y=0;y<A.sy;y+=stride) {
            for(var fx=0;fx<B.sx;fx++) {
              for(var fy=0;fy<B.sy;fy++) {

                var act=A.get(x,y,d);
                var weights = B.get(fx,fy,d);
                var conval = act*weights
                path_intensity+=conval;
              }
            }
          }
        }
        area = area * B.sx * B.sy;
        if(path_intensity < 0) path_intensity = -1 * path_intensity;
        path_arr.push(path_intensity / area);
      }
      return path_arr;
    } else {
      var d = index;
      for(var x=0;x<A.sx;x++) {
        for(var y=0;y<A.sy;y++) {
          var act=A.get(x,y,d);
          if(act < 0) act = -1 * act;
          path_intensity+=act;
        }
      }
    }
  }

  if(L1.layer_type == 'input') {
    var num_out = get_number_of_elements_in_layer(L2);
    var path_arr = [];
    for(var i=0; i<num_out; i++) {
      path_arr.push(path_intensity / area);
    }

    return path_arr;
  }

  var path_arr = [];
  path_arr.push(path_intensity / area);
  return path_arr;
}
