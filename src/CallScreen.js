import AgoraRTC from "agora-rtc-sdk-ng";
import axios from "axios";
import React, { useEffect, useState } from "react";
import "./CallScreen.css"; // Import custom styles for the UI

const CallScreen = () => {
  const [client] = useState(() =>
    AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  );
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [remoteUsers, setRemoteUsers] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const appID = "18f703bfff9345528a1e8de237affa3c"; // Your Agora app ID
  const serverURL = "https://backend-agora-voicecall.onrender.com"; // Your backend server URL

  const joinChannel = async (channelName, uid) => {
    try {
      // Get Token
      const { data } = await axios.post(`${serverURL}/generateToken`, {
        channelName,
        uid,
        role: "publisher",
      });

      // Join Channel
      await client.join(appID, channelName, data.token, uid);

      // Create Tracks
      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalTracks({ video: videoTrack, audio: audioTrack });

      // Publish Tracks
      await client.publish([audioTrack, videoTrack]);

      console.log("Joined channel successfully");
    } catch (error) {
      console.error("Error joining channel:", error);
    }
  };

  const leaveChannel = async () => {
    try {
      if (localTracks.audio) {
        localTracks.audio.stop();
        localTracks.audio.close();
      }
      if (localTracks.video) {
        localTracks.video.stop();
        localTracks.video.close();
      }

      if (client.connectionState !== "DISCONNECTED") {
        await client.unpublish();
        await client.leave();
        console.log("Left channel successfully");
      } else {
        console.warn("Client is not connected to any channel");
      }

      setLocalTracks({ video: null, audio: null });
    } catch (error) {
      console.error("Error leaving the channel:", error);
    }
  };

  const toggleAudio = async () => {
    if (localTracks.audio) {
      // Toggle audio
      if (isAudioMuted) {
        localTracks.audio.setEnabled(true); // Unmute
      } else {
        localTracks.audio.setEnabled(false); // Mute
      }
      setIsAudioMuted(!isAudioMuted); // Update mute state
    } else {
      console.error("Audio track is not available");
    }
  };

  const toggleVideo = async () => {
    if (localTracks.video) {
      if (isVideoMuted) {
        localTracks.video.setEnabled(true);
      } else {
        localTracks.video.setEnabled(false);
      }
      setIsVideoMuted(!isVideoMuted);
    } else {
      console.error("Video track is not available");
    }
  };

  useEffect(() => {
    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        const remoteVideoTrack = user.videoTrack;
        const playerContainer = document.createElement("div");
        playerContainer.id = user.uid;
        playerContainer.classList.add("remote-player");
        document.getElementById("remote-players").append(playerContainer);
        remoteVideoTrack.play(playerContainer);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    client.on("user-unpublished", (user) => {
      const playerContainer = document.getElementById(user.uid);
      if (playerContainer) playerContainer.remove();
    });

    return () => {
      leaveChannel();
    };
  }, [client]);

  return (
    <div className="call-screen">
      <div className="call-header">
        <h1>Agora Video Call</h1>
        <button className="leave-btn" onClick={leaveChannel}>
          Leave Call
        </button>
      </div>

      <div className="video-container">
        <div id="local-player" className="local-player"></div>
        <div id="remote-players" className="remote-players"></div>
      </div>

      <div className="controls">
        <button className="control-btn" onClick={toggleAudio}>
          {isAudioMuted ? "Unmute" : "Mute"} Audio
        </button>
        <button className="control-btn" onClick={toggleVideo}>
          {isVideoMuted ? "Turn On Video" : "Turn Off Video"}
        </button>
      </div>

      <div className="join-btn-container">
        <button
          className="join-btn"
          onClick={() =>
            joinChannel("testChannel", Math.floor(Math.random() * 1000))
          }
        >
          Join Call
        </button>
      </div>
    </div>
  );
};

export default CallScreen;
