import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ChessGameProps {
  matchId: Id<"matches">;
  tournamentId: Id<"tournaments">;
  isSpectator?: boolean;
}

interface ChessPosition {
  row: number;
  col: number;
}

interface ChessPiece {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: 'white' | 'black';
  position: ChessPosition;
  hasMoved?: boolean;
}

const initialBoard: (ChessPiece | null)[][] = [
  [
    { type: 'rook', color: 'black', position: { row: 0, col: 0 } },
    { type: 'knight', color: 'black', position: { row: 0, col: 1 } },
    { type: 'bishop', color: 'black', position: { row: 0, col: 2 } },
    { type: 'queen', color: 'black', position: { row: 0, col: 3 } },
    { type: 'king', color: 'black', position: { row: 0, col: 4 } },
    { type: 'bishop', color: 'black', position: { row: 0, col: 5 } },
    { type: 'knight', color: 'black', position: { row: 0, col: 6 } },
    { type: 'rook', color: 'black', position: { row: 0, col: 7 } },
  ],
  Array(8).fill(null).map((_, col) => ({ type: 'pawn', color: 'black', position: { row: 1, col } })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map((_, col) => ({ type: 'pawn', color: 'white', position: { row: 6, col } })),
  [
    { type: 'rook', color: 'white', position: { row: 7, col: 0 } },
    { type: 'knight', color: 'white', position: { row: 7, col: 1 } },
    { type: 'bishop', color: 'white', position: { row: 7, col: 2 } },
    { type: 'queen', color: 'white', position: { row: 7, col: 3 } },
    { type: 'king', color: 'white', position: { row: 7, col: 4 } },
    { type: 'bishop', color: 'white', position: { row: 7, col: 5 } },
    { type: 'knight', color: 'white', position: { row: 7, col: 6 } },
    { type: 'rook', color: 'white', position: { row: 7, col: 7 } },
  ],
];

export function ChessGame({ matchId, tournamentId, isSpectator = false }: ChessGameProps) {
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState<ChessPosition | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [gameStatus, setGameStatus] = useState<'active' | 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'timeout'>('active');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600); // 10 minutes
  const [isStreamingVideo, setIsStreamingVideo] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const chessGame = useQuery(api.chess.getChessGame, { matchId });
  const match = useQuery(api.matches.getMatch, { matchId });
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
  const makeMove = useMutation(api.chess.makeMove);
  const startVideoStream = useMutation(api.chess.startVideoStream);
  const stopVideoStream = useMutation(api.chess.stopVideoStream);

  // Timer effect
  useEffect(() => {
    if (gameStatus !== 'active') return;

    const timer = setInterval(() => {
      if (currentPlayer === 'white') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            setGameStatus('checkmate');
            toast.error("White ran out of time!");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            setGameStatus('checkmate');
            toast.error("Black ran out of time!");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPlayer, gameStatus]);

  // Load game state from database
  useEffect(() => {
    if (chessGame) {
      try {
        const gameData = JSON.parse(chessGame.gameData || '{}');
        if (gameData.board) {
          setBoard(gameData.board);
        }
        setCurrentPlayer(chessGame.currentPlayer);
        setGameStatus(chessGame.gameStatus);
        setWhiteTime(chessGame.whiteTimeRemaining);
        setBlackTime(chessGame.blackTimeRemaining);
        if (gameData.moveHistory) {
          setMoveHistory(gameData.moveHistory);
        }
      } catch (error) {
        console.error("Failed to load game state:", error);
      }
    }
  }, [chessGame]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPieceSymbol = (piece: ChessPiece) => {
    const symbols = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    return symbols[piece.color][piece.type];
  };

  const isValidMove = (from: ChessPosition, to: ChessPosition): boolean => {
    const piece = board[from.row][from.col];
    if (!piece) return false;

    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    // Basic move validation (simplified)
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    switch (piece.type) {
      case 'pawn':
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        if (colDiff === 0) {
          if (targetPiece) return false;
          if (from.row + direction === to.row) return true;
          if (from.row === startRow && from.row + 2 * direction === to.row) return true;
        } else if (colDiff === 1 && from.row + direction === to.row) {
          return !!targetPiece;
        }
        return false;

      case 'rook':
        return (rowDiff === 0 || colDiff === 0) && isPathClear(from, to);

      case 'bishop':
        return rowDiff === colDiff && isPathClear(from, to);

      case 'queen':
        return (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) && isPathClear(from, to);

      case 'knight':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

      case 'king':
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  const isPathClear = (from: ChessPosition, to: ChessPosition): boolean => {
    const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
    const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;

    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (board[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (isSpectator || gameStatus !== 'active') return;

    const clickedSquare = { row, col };

    if (!selectedSquare) {
      const piece = board[row][col];
      if (piece && piece.color === currentPlayer) {
        setSelectedSquare(clickedSquare);
      }
    } else {
      if (selectedSquare.row === row && selectedSquare.col === col) {
        setSelectedSquare(null);
        return;
      }

      if (isValidMove(selectedSquare, clickedSquare)) {
        try {
          const newBoard = board.map(row => [...row]);
          const piece = newBoard[selectedSquare.row][selectedSquare.col];
          
          if (piece) {
            newBoard[clickedSquare.row][clickedSquare.col] = piece;
            newBoard[selectedSquare.row][selectedSquare.col] = null;
            piece.position = clickedSquare;
            piece.hasMoved = true;
          }

          const moveNotation = `${String.fromCharCode(97 + selectedSquare.col)}${8 - selectedSquare.row}-${String.fromCharCode(97 + clickedSquare.col)}${8 - clickedSquare.row}`;
          const newMoveHistory = [...moveHistory, moveNotation];

          await makeMove({
            matchId,
            from: selectedSquare,
            to: clickedSquare,
            gameData: JSON.stringify({
              board: newBoard,
              moveHistory: newMoveHistory
            })
          });

          setBoard(newBoard);
          setMoveHistory(newMoveHistory);
          setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
          setSelectedSquare(null);

        } catch (error) {
          toast.error("Invalid move");
        }
      } else {
        const piece = board[row][col];
        if (piece && piece.color === currentPlayer) {
          setSelectedSquare(clickedSquare);
        } else {
          setSelectedSquare(null);
        }
      }
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      streamRef.current = stream;
      setIsStreamingVideo(true);
      
      await startVideoStream({ matchId });
      toast.success("Video stream started");
    } catch (error) {
      toast.error("Failed to start video stream");
    }
  };

  const stopVideo = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreamingVideo(false);
    
    try {
      await stopVideoStream({ matchId });
      toast.success("Video stream stopped");
    } catch (error) {
      toast.error("Failed to stop video stream");
    }
  };

  const canStartStream = match && loggedInUser && 
    (match.player1Id === loggedInUser._id || match.player2Id === loggedInUser._id);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Chess Board */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Game Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">
                {currentPlayer === 'white' ? '⚪' : '⚫'} {currentPlayer}'s turn
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                gameStatus === 'active' ? 'bg-green-100 text-green-800' :
                gameStatus === 'checkmate' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {gameStatus}
              </div>
            </div>
            
            {/* Timer */}
            <div className="flex gap-4">
              <div className={`px-3 py-2 rounded-lg ${currentPlayer === 'black' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
                ⚫ {formatTime(blackTime)}
              </div>
              <div className={`px-3 py-2 rounded-lg ${currentPlayer === 'white' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
                ⚪ {formatTime(whiteTime)}
              </div>
            </div>
          </div>

          {/* Chess Board */}
          <div className="inline-block border-2 border-gray-800">
            {board.map((row, rowIndex) => (
              <div key={rowIndex} className="flex">
                {row.map((piece, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-16 h-16 flex items-center justify-center text-4xl cursor-pointer select-none ${
                        isLight ? 'bg-amber-100' : 'bg-amber-800'
                      } ${isSelected ? 'ring-4 ring-blue-500' : ''} hover:opacity-80`}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                    >
                      {piece && getPieceSymbol(piece)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Video Stream Controls */}
          {canStartStream && (
            <div className="mt-4 flex gap-2">
              {!isStreamingVideo ? (
                <button
                  onClick={startVideo}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  🎥 Start Stream
                </button>
              ) : (
                <button
                  onClick={stopVideo}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  ⏹️ Stop Stream
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Video Stream */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Live Stream</h3>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {isStreamingVideo ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p>No stream active</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Move History */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Move History</h3>
          <div className="max-h-48 overflow-y-auto">
            {moveHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No moves yet</p>
            ) : (
              <div className="space-y-1">
                {moveHistory.map((move, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">{Math.floor(index / 2) + 1}.</span>
                    <span className="font-mono">{move}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Game Controls */}
        {!isSpectator && gameStatus === 'active' && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Game Controls</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors">
                Offer Draw
              </button>
              <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                Resign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
