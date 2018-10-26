# ReVACNN 
Real-Time Visual Analytics for Convolutional Neural Network

![](https://github.com/davianlab/deepVis/blob/master/paper/figure/main_fig.png)

## Abstract
Recently, deep learning has gained unprecedented popularity due to its outstanding performances in many machine learning and artificial intelligence applications. Among various deep learning models, a convolutional neural network (CNN) is one of the representative models that solved various complex tasks in computer vision since AlexNet, a widely used CNN model, has won the ImageNet challenge1 in 2012. Even with such a remarkable success, the issue of how it handles the underlying complexity of data so well has not been thoroughly investigated, while much effort was concentrated on pushing its performance to a new limit. Therefore, the current status of its increasing popularity and attention for various applications from both academia and industries is demanding a clearer and more detailed exposition of their inner workings. To this end, we introduce ReVACNN, an interactive visualization system that makes two major contributions: 1) a network visualization mod- ule for monitoring the underlying process of a convolutional neural network using filter-level 2D embedding view, 2) an interactive module that enables real-time steering of a model. We also present several use cases demonstrating benefits users can gain from our approach.

## Filter-level 2D embedding visualization
![](https://github.com/davianlab/deepVis/blob/master/paper/figure/t-sne_view.png)
The filter coefficients and the activation maps have frequently been the main subject of visualization when analyzing a convolutional neural network. In our system, we explore them using t-SNE. As shown in the left side of Figure, users can open up each layer panel and observe t-SNE view of filter coefficients, filter gradients, its activation map, and the activation gradients at the corresponding layer by clicking the radio button in the left pane. 

## Start
**Note**: Running this requires [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which includes [npm](https://npmjs.org)) on your system.

```bash
# Clone the repository
$ git clone https://github.com/davianlab/deepVis.git
# Go into the repository
$ cd deepVis
# Install dependencies and run the app http-server
$ npm install
$ npm start
# Open http://localhost:8080/ on your browser
# or use watch-http-server
$ npm run watch
# Open http://0.0.0.0:8080/
```

## API Reference
- [API List](https://github.com/davianlab/deepVis/wiki/API)

## Open Source Software Notice
**ConvNetJS** https://github.com/karpathy/convnetjs
> Copyright (c) 2014 Andrej Karpathy All rights reserved.
MIT License

**tSNEJS** https://github.com/karpathy/tsnejs
> MIT License

**d3** https://github.com/d3/d3
> Copyright 2010-2016 Mike Bostock All rights reserved.

**bootstrap** https://github.com/twbs/bootstrap
> Copyright (c) 2011-2016 Twitter, Inc.
MIT License

**jquery** https://github.com/jquery/jquery
> Copyright jQuery Foundation and other contributors, https://jquery.org/