import React,{useState} from 'react';
import PropTypes from 'prop-types';
import CanvasWrapper from './components/CanvasWrapper';


import terrain from '../generated/test/terrain.json';
import samples from './samples/room_replay.json';

const App = ({ samples, terrain }) => {
    return <div className="App">
        <CanvasWrapper samples={samples} terrain={terrain} />
        <button>asd</button>
    </div>
}

App.propTypes = {
    samples: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    terrain: PropTypes.arrayOf(PropTypes.shape()).isRequired,
};

export default App;


