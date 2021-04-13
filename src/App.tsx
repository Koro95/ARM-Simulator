//import React from 'react';
import './App.css';
import Box from '@material-ui/core/Box';
import { Cpu } from './Cpu'
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import InputBase from '@material-ui/core/InputBase';

let cpu = new Cpu();

function App() {
  return (
    <div className="App">
      <header className="App-header">
        Header
      </header>
      <body className="App-body">
        <Box width="19.75%" mr="0.5%" height="100%">
          <Box height="50%" mb="0.5%" className="App-cpustate">
            <TableContainer style={{ height: "100%" }}>
              <Table size="small" aria-label="simple table">
                <TableBody>
                  {cpu.registers.map((row) => (
                    <TableRow>
                      <TableCell component="th" scope="row"> {row.name} </TableCell>
                      <TableCell component="th" scope="row">
                      <InputBase defaultValue={row.toHex()} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Box height="29.75%" mb="0.5%" className="App-debugger">
            Debugger
          </Box>
          <Box height="19.75%" className="App-options">
            Options
          </Box>
        </Box>
        <Box width="79.75%" height="100%">
          <Box height="79.5%" mb="0.5%" className="App-textbox">
            Input Textbox
          </Box>
          <Box height="19.6%" className="App-terminal">
            Terminal
          </Box>
        </Box>
      </body>
    </div>
  );
}

export default App;
