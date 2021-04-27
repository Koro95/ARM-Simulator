import './App.css';
import { Cpu } from './Cpu'

import React from 'react';
import Box from '@material-ui/core/Box';
import TextField from '@material-ui/core/TextField';


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
            <div> <div className="Reg-names">{cpu.registers[0].name}</div> <InputBase defaultValue={cpu.registers[0].value} onChange={e => regValueChange(e)} /> </div>

          </Box>
          <Box height="29.75%" mb="0.5%" className="App-debugger">
            Debugger
          </Box>
          <Box height="19.75%" className="App-options">
            Options
          </Box>
        </Box>
        <Box width="79.75%" height="100%">
    
            <TextField
              className="App-userinput"
              multiline={true}
              defaultValue="Default Value"
              fullWidth={true}
              rows={20}
            />

         
          <Box height="19.6%" className="App-terminal">
            Terminal
          </Box>
        </Box>
      </body>
    </div>
  );

  function regValueChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    console.log(e.currentTarget.value);
    console.log(cpu.registers[0].value);
  }
}



export default App;
