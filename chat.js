const { log } = require("console");
const express = require("express");
const app = express();
// socket은 express가 아님 http 모듈에 연결해야 사용가능
const http = require("http").Server(app);
const io = require("socket.io")(http); // http-socket 연결
const PORT = 8009;

app.set("view engine", "ejs");
app.use("/views", express.static(__dirname + "/views"));
app.use("/static", express.static(__dirname + "/static"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("chat");
});

const nickArray = {}; // 유저목록

// [실습46] DM기능 구현
// 유저목록 업데이트(유저입장, 퇴장시)
function updateList() {
  io.emit("updateNicks", nickArray); // { socket.id: nick1, socket.id: nick2, ... }
}

// io.on
// : socket과 관련된 통신작업을 처리
io.on("connection", (socket) => {
  // 'connection' event
  // : 클라이언트가 서버에 접속했을 때 발생, 콜백으로 socket객체를 전송
  console.log("💥Server Socket Connected💥 >> ", socket.id);
  // socket.id: 소켓 고유 아이디 -> socket은 💥💥웹페이지 별로💥💥 생김

  //   // [실습44] 채팅창 안내 문구
  //   io.emit("notice", `${socket.id.slice(0, 5)}님이 입장하셨습니다.`);

  //   [실습44-2] 채팅창 입장 안내문구 socket.id -> nickname
  socket.on("setNick", (nick) => {
    console.log("socket on setNick >> ", nick);

    // nickArray: {socket.Id1: nick1, socket.Id2: nick2, ...}
    // -> Object.values(): [nick1, nick2, nick3... ]
    // -> indexOf(): nick이 존재하는지
    if (Object.values(nickArray).indexOf(nick) > -1) {
      // 닉네임 중복이 있다면
      socket.emit("error", "중복된 닉네임 입니다~!");
      return;
    } else {
      // 닉네임 중복이 없다면
      nickArray[socket.id] = nick; // { socket.id: nick }
      console.log("접속 유저목록 >>", nickArray);
      io.emit("notice", `${nick}님이 입장하셨습니다.`);
      socket.emit("entrySuccess", nick);
      updateList(); // 유저목록 업데이트
    }
  });

  // [실습44-3] 접속자 퇴장시
  // 'notice' 이벤트로 퇴장 공지
  socket.on("disconnect", () => {
    // 1. socket.id 콘솔로그찍기
    console.log("💥Server Socket Disconnect💥", socket.id);
    // 2. 전체공지 ('notice', 퇴장메세지(유저닉네임 포함))
    //  ex. aa님이 퇴장하셨습니다.
    io.emit("notice", `${nickArray[socket.id]}님이 퇴장하셨습니다.`);
    // 3. nickArray에서 해당유저 삭제(객체에서 key-value 삭제)
    console.log(nickArray[socket.id]);
    delete nickArray[socket.id];
    updateList(); // 유저목록 업데이트
  });

  // [실습45] 채팅창 메세지 전송 Step1
  socket.on("send", (data) => {
    console.log("socket on send >> ", data); // { myNick: 'a', dm: '전체 | 특정닉네임', msg: 'cc' }
    // 전체: socket on send >>  { myNick: 'd', dm: 'all', msg: 'sd' }
    // 특정아이디: socket on send >>  { myNick: 'd', dm: 'QT7WFj-UkTnlezyjAAAF', msg: 'sd' }

    console.log(nickArray);
    console.log(nickArray[socket.id]);
    console.log(nickArray[data.dm]);
    console.log(data);
    console.log(data.dm);
    console.log(data.myNick);

    if (data.dm !== "all") {
      let dmSocketId = data.dm; // 특정 유저의 socket id
      const sendData = { nick: data.myNick, msg: data.msg, dm: "(속닥속닥)" };
      // dm전송 부분
      if (nickArray[data.dm] == data.myNick) {
        return socket.emit("newMessage", sendData); // 자기자신에게만 DM 메세지 전송
      }
      io.to(dmSocketId).emit("newMessage", sendData); // 특정 소켓아이디에게만 DM메세지 전송
      socket.emit("newMessage", sendData); // 자기자신에게도 DM 메세지 전송
    } else {
      // 전체 전송 부분
      // [실습45] 채팅창 메세지 전송 Step2
      const sendData = { nick: data.myNick, msg: data.msg };
      io.emit("newMessage", sendData);
    }
  });
});

// 주의!!! 소켓을 사용하기 위해서는 http.listen()으로 포트를 열어야 함
http.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});

//   //   [실습42] // io.on 안에 있어야함
//   socket.on("hello", (data) => {
//     // on으로 front에서 전달받은 data를 console.log로 찍음
//     // console.log("socket on hello >> ", data);
//     console.log(`${data.who} : ${data.msg}`);
//     socket.emit("helloKr", { who: "hello", msg: "안녕~~~" }); // emit으로 front에 data를 보내줌
//   });

//   socket.on("study", (data) => {
//     // on으로 front에서 전달받은 data를 console.log로 찍음
//     // console.log("socket on study >> ", data);
//     console.log(`${data.who} : ${data.msg}`);
//     socket.emit("studyKr", { who: "study", msg: "공부하자!" }); // emit으로 front에 data를 보내줌
//   });

//   socket.on("bye", (data) => {
//     // on으로 front에서 전달받은 data를 console.log로 찍음
//     // console.log("socket on bye >> ", data);
//     console.log(`${data.who} : ${data.msg}`);
//     socket.emit("byeKr", { who: "bye", msg: "잘가~~~!!" }); // emit으로 front에 data를 보내줌
//   });
