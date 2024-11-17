import { useEffect, useRef } from "react";

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "receiver",
                })
            );
        };

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }, 
            ],
        });

        pc.ontrack = (event) => {
            event.streams.forEach((stream) => {
                if (event.track.kind === "video" && videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
              

                if (event.track.kind == "audio" && audioRef.current) {
                    audioRef.current.srcObject = stream;
                 
                 
                }
            });
        };

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === "createOffer") {
                await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.send(
                    JSON.stringify({
                        type: "createAnswer",
                        sdp: pc.localDescription,
                    })
                );
            } else if (message.type === "iceCandidate") {
                await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        return () => {
            socket.close();
            pc.close();
        };
    }, []);

    return (
        <div>


            
            <h2>Receiver</h2>
            <video ref={videoRef} width={400} height={400} muted autoPlay ></video>
            <audio ref={audioRef} autoPlay controls></audio>
        </div>
    );
};
