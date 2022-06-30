import React, { useEffect, useState, useRef } from 'react';

import { User } from './components/User';
import { MyUserProfile } from './components/MyUserProfile';

import './App.css';

// Use for remote connections
const configuration = {
  iceServers: [{ urls: "stun:stun.1.google.com:19302" }]
};

// Use for local connections
// const configuration = null;

function App() {
  // WebSocket State
  const webSocket = useRef(null);
  const connectedRef = useRef();
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);

  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});

  const [connectedTo, setConnectedTo] = useState();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState();
  const [channel, setChannel] = useState();

  // App State
  const [myData, setMyData] = useState({});
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState('');
  const [offerTo, setOfferTo] = useState();

  const send = data => webSocket.current.send(JSON.stringify(data));

  const onConnectedUserLeave = () => {
    setConnectedTo(undefined);
    setIsConnected(false);
  }

  // All WebSocket Handlers
  const handleConnect = (message) => {
    const { name, ip, ipCode } = message;
    setSocketOpen(true);
    setMyData({ name, ip, ipCode });
  }

  const handleLogin = (message) => {
    const { success, users } = message;
    if (!success) {
      window.alert('Failed to login');
      return;
    }
    setUsers(users);
    let localConnection = new RTCPeerConnection(configuration);

    // when the browser finds an ice candidate we send it to another peer
    localConnection.onicecandidate = ({ candidate }) => {
      console.log('found ice candidate')
      console.log('candidate: ', candidate)
      console.log('connectedTo', connectedRef.current)
      let con = connectedRef.current;

      if (candidate && !!con) {
        console.log('actually do something')
        send({
          name: con,
          type: "candidate",
          candidate
        });
      }
    };
    localConnection.ondatachannel = event => {
      console.log("Data channel is created!");
      let receiveChannel = event.channel;
      receiveChannel.onopen = () => {
        console.log("Data channel is open and ready to be used.");
        // Receiver is now connected
        setIsConnected(true);
      };
      receiveChannel.onmessage = handleDataChannelMessageReceived;
      setChannel(receiveChannel);
    };
    console.log('set connectino to ', localConnection)
    setConnection(localConnection);
  }

  const handleUpdateUser = (message) => {
    const { user: newUser } = message;
    setUsers([...users, newUser]);
  }

  const handleLeaveUser = (message) => {
    const { user: leaveUser } = message;
    const updatedUserList = users.filter(user => user.id !== leaveUser.id);
    setUsers(updatedUserList);
  }

  const handleDataChannelMessageReceived = ({ data }) => {
    const message = JSON.parse(data);
    console.log(message);
    const { name: user } = message;
    let messages = messagesRef.current;
    let userMessages = messages[user];
    if (userMessages) {
      userMessages = [...userMessages, message];
      let newMessages = Object.assign({}, messages, { [user]: userMessages });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      let newMessages = Object.assign({}, messages, { [user]: [message] });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    }
  };

  //when somebody wants to message us
  const handleOffer = ({ offer, name }) => {
    setConnectedTo(name);
    connectedRef.current = name;
    const offerReq = window.confirm(`${name} has offered ${offer}. Do you want to accept?`)

    if (offerReq) {
      console.log('offer: ', offer)
      console.log('connection: ', connection)
      connection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => connection.createAnswer())
        .then(answer => connection.setLocalDescription(answer))
        .then(() =>
          send({ type: "answer", answer: connection.localDescription, name })
        )
        .catch(e => {
          console.log({ e });
          window.alert('An error has occurred.'
          );
        });
    }
  };

  //when another user answers to our offer
  const handleAnswer = ({ answer }) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const handleCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
    setIsConnected(true);
  };


  useEffect(() => {
    // add the websocket url to env in production environment     
    // webSocket.current = new WebSocket("ws://192.168.0.11:9000");
    webSocket.current = new WebSocket("wss://air-chat-ws.herokuapp.com");
    webSocket.current.onmessage = message => {
      const data = JSON.parse(message.data);
      setSocketMessages(prev => [...prev, data]);
    };
    webSocket.current.onclose = () => {
      webSocket.current.close();
    };
    return () => webSocket.current.close();
  }, []);

  useEffect(() => {
    const message = socketMessages.pop();
    console.log(message);

    if (!message) return
    switch (message.type) {
      case "connect":
        handleConnect(message);
        break;
      case "login":
        handleLogin(message);
        break;
      case "updateUsers":
        handleUpdateUser(message);
        break;
      case "offer":
        handleOffer(message);
        break;
      case "answer":
        handleAnswer(message);
        break;
      case "candidate":
        handleCandidate(message);
        break;
      case "leave":
        handleLeaveUser(message);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketMessages])

  const handleConnection = () => {
    var dataChannelOptions = {
      reliable: true
    };

    let dataChannel = connection.createDataChannel("messenger");

    dataChannel.onerror = e => {
      console.error(e.error.message);
      if (e.error.message === 'User-Initiated Abort, reason=Close called') {
        onConnectedUserLeave();
      } else {
        window.alert(e.error.message);
      }
    }

    dataChannel.onmessage = handleDataChannelMessageReceived;
    setChannel(dataChannel);
    setConnectedTo(offerTo);

    connection
      .createOffer()
      .then(offer => connection.setLocalDescription(offer))
      .then(() =>
        send({ type: "offer", name: offerTo, offer: connection.localDescription })
      )
      .then(() => connectedRef.current = offerTo)
      .catch(e => {
        console.error(e);
        window.alert('handleconnection', e)
      });
  };

  useEffect(() => {
    console.log('connection updated to: ', connection)
  }, [connection])

  //when a user clicks the send message button
  const sendMsg = () => {
    let text = { message: input, name: myData.name };
    let messages = messagesRef.current;
    let con = connectedRef.current;
    console.log(con)
    let userMessages = messages[con];
    if (messages[con]) {
      userMessages = [...userMessages, text];
      let newMessages = Object.assign({}, messages, {
        [con]: userMessages
      });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      userMessages = Object.assign({}, messages, { [con]: [text] });
      messagesRef.current = userMessages;
      setMessages(userMessages);
    }
    channel.send(JSON.stringify(text));
    setInput("");
  };

  const usersDisplay = users.length > 0 ?
    <ul>
      {users.map(user =>
        <User key={user.id} data={user} offerTo={offerTo} setOfferTo={setOfferTo} />
      )}
    </ul >
    : <p>No devices nearby</p>


  useEffect(() => {
    console.log(messages);
  }, [messages])


  return (
    <div className="App">
      <header className="header">
        <div className='headerLeft'>
        </div>
        <h2>AirChat</h2>
        <div className='headerRight'>
          {!!offerTo ? <button className='chatButton' onClick={handleConnection}>Request Chat</button> : undefined}
        </div>
      </header>
      {socketOpen ?
        <div>
          <div className='usersDisplay'>
            {usersDisplay}
          </div>
          {isConnected ? <p>Connected to {connectedTo}</p> : undefined}
          {isConnected ? (
            <div>
              <div>
                <ul>
                  {messages[connectedTo] && messages[connectedTo].map((msg, i) => {
                    const { message, name } = msg;
                    return (
                      <li key={`${name}${message}${i}`}>
                        {name}: {message}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <input type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    sendMsg();
                    return;
                  }
                }}
              />
              <button onClick={sendMsg} disabled={!isConnected}>Send</button>
            </div>
          ) : undefined}
          <MyUserProfile myData={myData} />
        </div>
        :
        <p>Loading...</p>
      }
    </div>
  );
}

export default App;
