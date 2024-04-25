import React from 'react';
import PropTypes from 'prop-types';
import CanvasWrapper from './components/CanvasWrapper';
import listReactFiles from 'list-react-files'


const App = ({ samples, terrain }) => (
    <div>
        <div className="App">
            <CanvasWrapper samples={samples} terrain={terrain} />
            <button>asd</button>
        </div>
        <Selector></Selector>
    </div>

);

const Selector = () => {

    return <div style={{position:"fixed", bottom:"10%", backgroundColor:"white"}}>
        asd
    </div>
}

App.propTypes = {
    samples: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    terrain: PropTypes.arrayOf(PropTypes.shape()).isRequired,
};

export default App;
