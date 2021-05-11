import './App.css';
import { Cpu } from './Cpu'

//import React from 'react';
import Box from '@material-ui/core/Box';


function App() {
  return (
    <div className="App">
      <div className="App-header">
        Header
      </div>
      <div className="App-body">
        <Box width="19.75%" mr="0.5%" height="100%">
          <Cpu></Cpu>
        </Box>
        <Box width="79.75%" height="100%">
          <Box height="79.5%" mb="0.5%">
            <textarea className="App-userinput" defaultValue="Default Value" />
          </Box>
          <Box height="19.5%" className="App-terminal">
            Terminal
          </Box>
        </Box>
      </div>
    </div>
  );
}



export default App;
