const w = window.innerWidth * 0.75;
const h = window.innerHeight;

const svg = d3.select('#graph')
    .append('svg')
    .attr('width', w)
    .attr('height', h);

const force = d3.layout.force()
    .size([w, h])
    .linkDistance(100)
    .charge(-500)
    .gravity(0.5);

const nodes = [];


const links = [];

/**
 * Add a node to the graph.
 * @param {object} data
 * @param {boolean} r
 */
!function addNode(data, r=false) {
  const node = {x: 0, y: 0, r: 5, name: data.id._idB58String};
  nodes.push(node);
  console.log('Circle added: ' + data.id._idB58String);

  if (r) restartPlot();
};

/**
 * Add a link to the graph.
 * @param {object} data
 * @param {boolean} r
 */
!function addLink(data, r=false) {
  const source = nodes.map(function(o) {
    return o.name;
  }).indexOf(data.source);
  const target = nodes.map(function(o) {
    return o.name;
  }).indexOf(data.target);
  if (source == -1 || target == -1) {
    if (source == -1) {
      socket.emit('requestNode', data.source);
    }
    if (target == -1) {
      socket.emit('requestNode', data.target);
    }
    console.log('Link not found');
    console.log(data);
    setTimeout(function() {
      addLink(data, r);
    }, 4000);
    return;
  }
  const link = {source: source, target: target, value: 1};
  links.push(link);
  console.log('Link added: source: ' + source + ' target: ' + target);

  if (r) restartPlot();
};

/**
 * Remove node from the graph.
 * @param {object} data
 * @param {boolean} r
 */
!function delNode(data, r=false) {
  const index = nodes.findIndex(function(e) {
    return e.name == data.id._idB58String;
  });
  nodes.splice(index, 1);
  // delete all links of node

  linksToDelete = links.filter(function( e ) {
    return e.source.name == data.id._idB58String || e.target.name == data.id._idB58String;
  });
  for (let l=0; l<linksToDelete.length; l++) {
    const index = links.indexOf(linksToDelete[l]);
    if (index != -1) {
      links.splice(index, 1);
    }
  }
  if (r) restartPlot();
};

/**
 * Remove link from the graph.
 * @param {object} data
 * @param {boolean} r
 */
!function delLink(data, r=false) {
  const index = links.findIndex(function(e) {
    return e.source.name == data.source && e.target.name == data.target;
  });
  links.splice(index, 1);
  if (r) restartPlot();
};

/**
 * Redo the graph
 */
function restartPlot() {
  force.nodes(nodes)
      .links(links)
      .start();

  const link = svg.selectAll('.link')
      .data(links);

  link.enter().append('line')
      .attr('class', 'link');

  link.exit().remove();

  const node = svg.selectAll('.node')
      .data(nodes);

  node.enter().append('g')
      .attr('class', 'node')
      .append('image')
      .attr('xlink:href', '/favicon.ico')
      .attr('x', -8)
      .attr('y', -8)
      .attr('width', 20)
      .attr('height', 20)
      .select(function() {
        return this.parentNode;
      })
      .append('text')
      .attr('dx', 12)
      .attr('dy', '.35em')
      .text(function(d) {
        return d.name;
      });

  node.exit().remove();

  force.on('tick', () => {
    link.attr('x1', function(d) {
      return d.source.x;
    })
        .attr('y1', function(d) {
          return d.source.y;
        })
        .attr('x2', function(d) {
          return d.target.x;
        })
        .attr('y2', function(d) {
          return d.target.y;
        });
    node.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  });
}

/**
 * Switch the visibility of node labels
 */
!function switchLabels() {
  const nodes = document.querySelectorAll('.node text');
  const checkStatus = document.getElementById('labelsCheckbox').checked;
  nodes.forEach(function(div) {
    if (checkStatus) {
      div.style.display='block';
    } else {
      div.style.display='none';
    }
  });
};
