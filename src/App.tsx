//import React from 'react';
import './App.css';
import Box from '@material-ui/core/Box';

function App() {
  return (
    <div className="App">
      <header className="App-header">
          Header
      </header>
      <body className="App-body">
        <Box width="19.75%" mr="0.5%" height="100%">  
          <Box height="50%" mb="0.5%" className="App-cpustate">
            Register
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
          <Box height="19.6%"  className="App-terminal">
            Terminal
          </Box>
        </Box>
      </body>
    </div>
  );
}

export default App;
