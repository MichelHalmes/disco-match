import React from 'react';
import { connect } from 'react-redux';

import io from 'socket.io-client';
import { Modal } from 'semantic-ui-react';

import './App.css';
import CONFIG from '../../config.js';

import Client from './Client.js';
import { TweetMessage } from './Components.jsx';
import ModalSetUser from './containers/ModalSetUser';
import MessagePopup from './containers/MessagePopup';
import AudioPlayer from './containers/AudioPlayer';
import CodeArea from './containers/CodeArea';


const App = React.createClass({
  getInitialState: function () {
    // let username = JSON.parse(localStorage.getItem('username'));
    this.lastActivity = new Date().getTime();
    this.resolveInactivity;

    return {code: undefined,
      // username: username,
      // messages: [],
      // matchedCurrentCode: false,
      isInactive: false
    };
  },

  componentDidMount: function () {
    let self = this;
    this.props.getCode()

    self.socket = io();
    self.socket.on('connect', () => self.socket.emit('send:username', self.props.username));

    self.socket.on('code:match', function ({username, matchUsername, points}) {
      if (username!== self.props.username) throw new Error('Codematch for another user: ' + username);
      self.props.matchCodeSuccess(matchUsername, points)
    });
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (this.props.username && prevProps.username !== this.props.username) {
      this.socket.emit('send:username', this.props.username);
    }
  },

  // handleLoginSubmit: function (username, email) {
  //   let self = this;
  //   username = username.trim();
  //   return Client.postLogin(username, email)
  //     .then(function (res) {
  //       self.setState({username});
  //       self.props.updatePoints(res.points);
  //       localStorage.setItem('username', JSON.stringify(username));
  //       self.handelCodeRequest();
  //       return true;
  //     })
  //     .catch(function (error) {
  //       // eslint-disable-next-line
  //       if (error.response.status == 403) { // username already exists!
  //         return false;
  //       } else {
  //          throw error;
  //       }
  //     });
  // },

  // handelCodeRequest: function () {
  //   let self = this;
  //   self.setState({code: undefined});
  //   if (!self.props.username) return Promise.resolve(); // After Login error
  //
  //   return new Promise(function(resolve) {
  //     if (new Date().getTime() - self.lastActivity < CONFIG.TIME_TO_INACTIVE_S * 1000) {
  //       resolve();
  //     } else {
  //       self.setState({isInactive: true});
  //       self.resolveInactivity = resolve;
  //     }})
  //     .then(() => Client.getCode(self.props.username))
  //     .then(function(res) {
  //       self.pushMessage(`New song, new luck...!`);
  //       self.props.updatePoints(res.points);
  //       self.setState({code: res.code, matchedCurrentCode: false});
  //
  //     })
  //     .catch(self.catchLoginError);
  // },

  // catchLoginError: function (error) {
  //   // eslint-disable-next-line
  //   if (error.response && error.response.status == 401) { // username not found
  //     this.setState({username: undefined});
  //     localStorage.removeItem('username')
  //     return false;
  //   } else {
  //      throw error;
  //   }
  // },

  // handleCodeSubmit: function (matchCode) {
  //   let self = this;
  //   return Client.postMatchCode(this.props.username, matchCode)
  //     .then(function ({accepted, points, matchUsername}) {
  //       if (accepted) {
  //         self.props.updatePoints(points);
  //         self.setState({matchedCurrentCode: true,
  //           messages: self.state.messages.concat([`You have matched with ${matchUsername}!`, `Click 'Next' for a new song!`]) });
  //         return true;
  //       } else {
  //         self.props.updatePoints(points);
  //         self.setState({messages: self.state.messages.concat([`Nope, wrong code!`]) });
  //         return false;
  //       }
  //     })
  // },

  handleReactivate: function () {
    this.resolveInactivity();
    this.recordActivity();
    this.setState({isInactive: false});
  },

  recordActivity: function () {
    this.lastActivity = new Date().getTime();
  },

  // voidMessages: function () {
  //   this.setState({messages: []})
  // },
  //
  // pushMessage: function (newMessage) {
  //   this.setState({messages: this.state.messages.concat([newMessage])});
  // },


  render() {
    return (
      <div className="ui center aligned basic segment no-margins" >
        <Header />
        <Points username={this.props.username} points={this.props.points}/>
        <AudioPlayer onActivity={this.recordActivity} />
        <CodeArea onActivity={this.recordActivity}/>
        <TweetMessage username={this.props.username} pushMessage={this.pushMessage}
              updatePoints={this.props.updatePoints} onActivity={this.recordActivity}/>
        <ModalSetUser  />
        <ModalInactivity isInactive={this.state.isInactive} onReactivate={this.handleReactivate} />
        <MessagePopup  />
      </div>
    );
  }
});

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

function Points(props) {
  return (
    <div className="ui center aligned basic segment no-margins">
      <div className="ui labeled button" tabIndex="0">
        <div className="ui basic blue button">
           {props.username}
        </div>
        <a className="ui basic left pointing blue label">
          {props.points} points
        </a>
      </div>
    </div>
  );
}


function Header(props) {
  return (
    <div >
      <h2 className="no-margins">
        <i className="music icon"></i>
          Disco-Connect
        <i className="music icon"></i>
      </h2>
      <div className="">Find a dancer with your song!</div>
      <div className="ui divider no-margins"></div>
    </div>
  );
}

function ModalInactivity(props) {
  return (
    <Modal open={props.isInactive} >
      <div className="ui center aligned basic segment">
        <h1>You have been inactive for quite some time...!?</h1>
        <button className="ui submit button green" onClick={props.onReactivate}>
          Continue playing!
        </button>
      </div>
    </Modal>
  );
}

const mapStateToProps = state => {
  return {
    points: state.pointsReducer,
    username: state.usernameReducer,
    code: state.codeReducer.code,
    matchedCurrentCode: state.codeReducer.matchedCurrentCode,
  }
}

import { updatePointsAC, matchCodeSuccessAC, getCodeAC } from './redux';

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    updatePoints: (points) => dispatch(updatePointsAC(points)),
    matchCodeSuccess: (matchUsername, points) => dispatch(matchCodeSuccessAC(matchUsername, points)),
    getCode:() => dispatch(getCodeAC()),
  }
}


export default connect(mapStateToProps, mapDispatchToProps)(App);
