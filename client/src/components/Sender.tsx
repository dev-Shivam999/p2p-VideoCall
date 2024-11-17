import { useEffect, useRef, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const newSocket = new WebSocket("ws://localhost:8080");
        setSocket(newSocket);

        newSocket.onopen = () => {
            newSocket.send(
                JSON.stringify({
                    type: "sender",
                })
            );
        };

        return () => {
            newSocket.close();
            pc?.close();
        };
    }, []);

    const initiateConnection = async () => {
        if (!socket) {
            alert("Socket not found");
            return;
        }

        const newPC = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
            ],
        });
        setPC(newPC);

        newPC.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(
                    JSON.stringify({
                        type: "iceCandidate",
                        candidate: event.candidate,
                    })
                );
            }
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "createAnswer") {
                await newPC.setRemoteDescription(new RTCSessionDescription(message.sdp));
            } else if (message.type === "iceCandidate") {
                await newPC.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        newPC.onnegotiationneeded = async () => {
            const offer = await newPC.createOffer();
            await newPC.setLocalDescription(offer);

            socket.send(
                JSON.stringify({
                    type: "createOffer",
                    sdp: newPC.localDescription,
                })
            );
        };

        getMediaStream(newPC);
    };

    const getMediaStream = (peerConnection: RTCPeerConnection) => {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }

                stream.getTracks().forEach((track) => {
                    peerConnection.addTrack(track, stream);
                });
            })
            .catch((error) => {
                console.error("Error accessing media devices:", error);
            });
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={initiateConnection}>Start Call</button>
            <video ref={videoRef} width={400} height={400} autoPlay controls muted playsInline></video>
        </div>
    );
};
