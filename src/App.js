import React, { useEffect, useState, useRef } from 'react';

import { User } from './components/User';
import { MyUserProfile } from './components/MyUserProfile';

import './App.css';

// Use for remote connections
// const configuration = {
//   iceServers: [{ url: "stun:stun.1.google.com:19302" }]
// };

// Use for local connections
const configuration = null;

function App() {
  // WebSocket State
  const webSocket = useRef(null);
  const connectedRef = useRef();
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);

  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});

  const [connectedTo, setConnectedTo] = useState();
  const [connection, setConnection] = useState();
  const [channel, setChannel] = useState();

  // App State
  const [myData, setMyData] = useState({});
  const [users, setUsers] = useState([]);
  const [input, setInput] = useState('');
  const [offerTo, setOfferTo] = useState();

  const send = data => webSocket.current.send(JSON.stringify(data));

  // All WebSocket Handlers
  const handleConnect = (message) => {
    const { name, ip } = message;
    setSocketOpen(true);
    setMyData({ name, ip });
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
      let connectedTo = connectedRef.current;

      if (candidate && !!connectedTo) {
        send({
          name: connectedTo,
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
      };
      receiveChannel.onmessage = handleDataChannelMessageReceived;
      setChannel(receiveChannel);
    };
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
  };

  //when another user answers to our offer
  const onAnswer = ({ answer }) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const onCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };


  useEffect(() => {
    // add the websocket url to env in production environment     
    webSocket.current = new WebSocket("ws://localhost:9000");
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
      case "leave":
        handleLeaveUser(message);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketMessages])

  const sendMessage = () => {
    const data = { type: "offer", name: "LightSalmon", offer: "deez" }
    webSocket.current.send(JSON.stringify(data));
  }

  const usersDisplay = users.length > 0 ?
    <ul>
      {users.map(user => <li key={user.id}>
        <User data={user} offerTo={offerTo} setOfferTo={setOfferTo} />
      </li>)}

    </ul> :
    <p>No devices nearby</p>


  return (
    <div className="App">
      <header className="App-header">Air Chat</header>
      <input type="text" value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send Message</button>
      {socketOpen ? <p>Socket opened</p> : undefined}
      <div>
        <h2>Nearby Devices</h2>
        {usersDisplay}
      </div>
      <MyUserProfile myData={myData} />
    </div>
  );
}

export default App;
