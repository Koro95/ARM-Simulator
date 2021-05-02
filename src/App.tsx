import './App.css';
import { Cpu } from './Cpu'

import React from 'react';
import Box from '@material-ui/core/Box';
import TextField from '@material-ui/core/TextField';
import InputBase from '@material-ui/core/InputBase';

function App() {
  let cpu = new Cpu();

  return (
    <div className="App">
      <header className="App-header">
        Header
      </header>
      <body className="App-body">
        <Box width="19.75%" mr="0.5%" height="100%">
          <Box height="50%" mb="0.5%" className="App-cpustate">
            <div> <div className="Reg-names">r0</div> <InputBase margin='none' defaultValue={cpu.registers[0].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r1</div> <InputBase defaultValue={cpu.registers[1].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r2</div> <InputBase defaultValue={cpu.registers[2].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r3</div> <InputBase defaultValue={cpu.registers[3].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r4</div> <InputBase defaultValue={cpu.registers[4].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r5</div> <InputBase defaultValue={cpu.registers[5].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r6</div> <InputBase defaultValue={cpu.registers[6].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r7</div> <InputBase defaultValue={cpu.registers[7].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r8</div> <InputBase defaultValue={cpu.registers[8].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r9</div> <InputBase defaultValue={cpu.registers[9].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r10</div> <InputBase defaultValue={cpu.registers[10].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r11</div> <InputBase defaultValue={cpu.registers[11].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">r12</div> <InputBase defaultValue={cpu.registers[12].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">sp</div> <InputBase defaultValue={cpu.registers[13].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">lr</div> <InputBase defaultValue={cpu.registers[14].toHex()} onChange={e => regValueChange(e)} /> </div>
            <div> <div className="Reg-names">pc</div> <InputBase defaultValue={cpu.registers[15].toHex()} onChange={e => regValueChange(e)} /> </div>
          </Box>
          <button onClick={LUL} >
  Activate Lasers
</button>
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

  function LUL(){
    cpu.ADD(cpu.registers[1], cpu.registers[2])
  }

  function regValueChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    console.log(e.currentTarget.value);
    console.log(cpu.registers[0].value);
  }
}



export default App;
