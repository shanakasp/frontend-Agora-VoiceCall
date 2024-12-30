import AgoraRTC from "agora-rtc-sdk-ng";
import axios from "axios";
import React, { useEffect, useState } from "react";

const CallScreen = () => {
  const [client] = useState(() =>
    AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  );
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [remoteUsers, setRemoteUsers] = useState({});

  const appID = "18f703bfff9345528a1e8de237affa3c"; // From .env file
  const serverURL = "http://localhost:5000"; // Your backend server

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

  useEffect(() => {
    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        const remoteVideoTrack = user.videoTrack;
        const playerContainer = document.createElement("div");
        playerContainer.id = user.uid;
        playerContainer.style.width = "200px";
        playerContainer.style.height = "150px";
        document.body.append(playerContainer);
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
    <div>
      <button
        onClick={() =>
          joinChannel("testChannel", Math.floor(Math.random() * 1000))
        }
      >
        Join Call
      </button>
      <button onClick={leaveChannel}>Leave Call</button>
      <div id="local-player" style={{ width: "400px", height: "300px" }}></div>
    </div>
  );
};

export default CallScreen;
