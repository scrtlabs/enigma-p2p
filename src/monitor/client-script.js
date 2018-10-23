const w = window.innerWidth
const h = window.innerHeight

const svg = d3.select('body')
  .append('svg')
    .attr('width', w)
    .attr('height', h)

const force = d3.layout.force()
  .size([w,h])
  .nodes([{}])
  .linkDistance(30)
  .charge(-30)
  .on('tick', () =>
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
  )  

var nodes = force.nodes(),
    node = svg.selectAll('.node')


function addNode(data){
  var node = {x: 0, y: 0, r: data},
      n = nodes.push(node);

  restart();
  console.log('Circle added: '+data)
}

function restart() {
  node = node.data(nodes);

  node.enter().insert("circle", ".cursor")
      .attr("class", "node")
      .attr("r", 5);

  node.exit()
      .remove();

  force.start();
}