const net = require('net')

const sockPath = process.argv[2]
const query = process.argv[3]

const socket = net.connect(sockPath, () => {
  socket.on('data', (data) => {
    console.log(data)
    process.exit(0)
  })
  socket.write(query + '\u0000', 'utf8')
})
socket.setEncoding('utf8')
