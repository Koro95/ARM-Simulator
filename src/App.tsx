import './App.css';
import { Cpu } from './Cpu'

//import React from 'react';
import Box from '@material-ui/core/Box';
import TextField from '@material-ui/core/TextField';

function App() {
  return (
    <div className="App">
      <div className="App-header">
        Header
      </div>
      <div className="App-body">
        <Box width="19.75%" mr="0.5%" height="100%">
          <Box height="50%" mb="0.5%" className="App-cpustate">
            <Cpu></Cpu>
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
      </div>
    </div>
  );
}



export default App;
