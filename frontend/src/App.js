import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Stethoscope, Brain, Heart, UserCheck, DollarSign, FileText, Send, Plus, Trophy, Target, Award, Star } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentSession, setCurrentSession] = useState(null);
  const [specialty, setSpecialty] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [selectedTest, setSelectedTest] = useState({ type: "", bodyPart: "" });
  const [scoringRules, setScoringRules] = useState(null);

  useEffect(() => {
    // Load scoring rules on component mount
    loadScoringRules();
  }, []);

  const loadScoringRules = async () => {
    try {
      const response = await axios.get(`${API}/scoring-rules`);
      setScoringRules(response.data);
    } catch (error) {
      console.error("Error loading scoring rules:", error);
    }
  };

  const createSession = async () => {
    if (!specialty.trim()) {
      alert("Please enter a medical specialty first");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/session`, {
        specialty: specialty.trim()
      });
      setCurrentSession(response.data);
      setSpecialty("");
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Error creating session. Please try again.");
    }
    setLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !currentSession) return;

    setLoading(true);
    const userMessage = chatMessage;
    setChatMessage("");

    try {
      const response = await axios.post(`${API}/chat`, {
        session_id: currentSession.id,
        message: userMessage
      });

      // Refresh session to get updated chat history
      const sessionResponse = await axios.get(`${API}/session/${currentSession.id}`);
      setCurrentSession(sessionResponse.data);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message. Please try again.");
    }
    setLoading(false);
  };

  const requestTest = async () => {
    if (!selectedTest.type || !currentSession) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/request-test`, {
        session_id: currentSession.id,
        test_type: selectedTest.type,
        body_part: selectedTest.bodyPart
      });

      // Refresh session to get updated chat history
      const sessionResponse = await axios.get(`${API}/session/${currentSession.id}`);
      setCurrentSession(sessionResponse.data);
      setSelectedTest({ type: "", bodyPart: "" });
    } catch (error) {
      console.error("Error requesting test:", error);
      alert("Error requesting test. Please try again.");
    }
    setLoading(false);
  };

  const submitDiagnosis = async () => {
    if (!diagnosis.trim() || !currentSession) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/submit-diagnosis`, {
        session_id: currentSession.id,
        diagnosis: diagnosis.trim()
      });

      // Refresh session to get updated chat history
      const sessionResponse = await axios.get(`${API}/session/${currentSession.id}`);
      setCurrentSession(sessionResponse.data);
      setDiagnosis("");
    } catch (error) {
      console.error("Error submitting diagnosis:", error);
      alert("Error submitting diagnosis. Please try again.");
    }
    setLoading(false);
  };

  const getPointsBadgeColor = (points) => {
    if (points > 0) return "bg-green-100 text-green-800 border-green-200";
    if (points < 0) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatMessage = (entry) => {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    if (entry.type === "user") {
      return (
        <div key={entry.timestamp} className="mb-4 flex justify-end">
          <div className="bg-blue-500 text-white p-3 rounded-lg max-w-md">
            <p className="text-sm">{entry.message}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs opacity-75">{timestamp}</span>
              {entry.points_earned && (
                <Badge className={`ml-2 ${getPointsBadgeColor(entry.points_earned)}`}>
                  {entry.points_earned > 0 ? '+' : ''}{entry.points_earned} pts
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    } else if (entry.type === "doctor") {
      return (
        <div key={entry.timestamp} className="mb-4 flex justify-start">
          <div className="bg-gray-100 p-3 rounded-lg max-w-md">
            <div className="flex items-center mb-2">
              <Stethoscope className="w-4 h-4 mr-2 text-green-600" />
              <span className="font-semibold text-sm">Attending Physician</span>
            </div>
            <div className="text-sm prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeHighlight]}
              >
                {entry.message}
              </ReactMarkdown>
            </div>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
        </div>
      );
    } else if (entry.type === "test_result") {
      return (
        <div key={entry.timestamp} className="mb-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg capitalize">
                  {entry.test_type.replace("_", " ")} - {entry.body_part}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-green-600">
                    ${entry.cost}
                  </Badge>
                  {entry.points_earned && (
                    <Badge className={getPointsBadgeColor(entry.points_earned)}>
                      {entry.points_earned > 0 ? '+' : ''}{entry.points_earned} pts
                    </Badge>
                  )}
                </div>
              </div>
              {entry.is_appropriate !== undefined && (
                <div className="mt-2">
                  <Badge variant={entry.is_appropriate ? "default" : "destructive"}>
                    {entry.is_appropriate ? "✓ Appropriate Test" : "⚠ Questionable Choice"}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">{entry.reasoning}</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-sm prose prose-sm max-w-none mb-3">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeHighlight]}
                >
                  {entry.results}
                </ReactMarkdown>
              </div>
              {entry.image_url && (
                <div className="mt-3">
                  <img 
                    src={entry.image_url} 
                    alt={`${entry.test_type} result`}
                    className="max-w-full h-48 object-cover rounded-lg border medical-image"
                  />
                </div>
              )}
              <span className="text-xs text-gray-500">{timestamp}</span>
            </CardContent>
          </Card>
        </div>
      );
    } else if (entry.type === "diagnosis_submission") {
      return (
        <div key={entry.timestamp} className="mb-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  Diagnosis Submission (Attempt #{entry.attempt_number})
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {entry.is_correct && <Badge className="bg-green-100 text-green-800">✓ Correct</Badge>}
                  {entry.is_correct === false && <Badge className="bg-red-100 text-red-800">✗ Incorrect</Badge>}
                  {entry.points_earned && (
                    <Badge className={getPointsBadgeColor(entry.points_earned)}>
                      {entry.points_earned > 0 ? '+' : ''}{entry.points_earned} pts
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <strong>Your Diagnosis:</strong> {entry.diagnosis}
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <strong>Evaluation:</strong>
                <div className="prose prose-sm max-w-none mt-2">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {entry.evaluation}
                  </ReactMarkdown>
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-2 block">{timestamp}</span>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-6">
              <Brain className="w-12 h-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-800">Medical Simulation Platform</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enhance your diagnostic skills through AI-powered patient scenarios. 
              Practice clinical reasoning, order tests, and receive real-time feedback with point scoring.
            </p>
          </div>

          <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center">
                <UserCheck className="w-6 h-6 mr-2 text-green-600" />
                Start New Case
              </CardTitle>
              <CardDescription>
                Enter the medical specialty you'd like to practice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Medical Specialty</label>
                <Textarea
                  placeholder="e.g., Hello, I want to improve myself in orthopedics..."
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <Button 
                onClick={createSession} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? "Creating Case..." : "Generate Case"}
                <Plus className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-4 gap-6 mt-12 max-w-6xl mx-auto">
            <Card className="text-center p-6">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">AI-Generated Cases</h3>
              <p className="text-sm text-gray-600">Realistic patient scenarios across all medical specialties</p>
            </Card>
            <Card className="text-center p-6">
              <Heart className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Interactive Diagnosis</h3>
              <p className="text-sm text-gray-600">Chat with virtual attending physicians for guidance</p>
            </Card>
            <Card className="text-center p-6">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Cost-Aware Practice</h3>
              <p className="text-sm text-gray-600">Learn healthcare economics while making clinical decisions</p>
            </Card>
            <Card className="text-center p-6">
              <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Point Scoring System</h3>
              <p className="text-sm text-gray-600">Earn points for correct decisions and learn from mistakes</p>
            </Card>
          </div>

          {scoringRules && (
            <Card className="max-w-4xl mx-auto mt-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-yellow-600" />
                  Scoring System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Earn Points For:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Correct test orders: +{scoringRules.correct_test_order} points</li>
                      <li>• Correct diagnosis: +{scoringRules.correct_diagnosis} points</li>
                      <li>• Helpful questions: +{scoringRules.helpful_question} points</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-600 mb-2">Lose Points For:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Inappropriate test orders: {scoringRules.incorrect_test_order} points</li>
                      <li>• Incorrect diagnosis: {scoringRules.incorrect_diagnosis} points</li>
                      <li>• Irrelevant questions: {scoringRules.irrelevant_question} points</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const getPointsColor = (points) => {
    if (points > 50) return "text-green-600";
    if (points > 0) return "text-green-500";
    if (points < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getPointsIcon = (points) => {
    if (points > 100) return <Award className="w-4 h-4" />;
    if (points > 50) return <Trophy className="w-4 h-4" />;
    if (points > 0) return <Star className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Medical Simulation</h1>
                <p className="text-sm text-gray-600 capitalize">{currentSession.specialty}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className={`${getPointsColor(currentSession.total_points)} border-current`}>
                {getPointsIcon(currentSession.total_points)}
                <span className="ml-1">Points: {currentSession.total_points}</span>
              </Badge>
              <Badge variant="outline" className="text-green-600">
                <DollarSign className="w-4 h-4 mr-1" />
                Total Cost: ${currentSession.total_cost}
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => setCurrentSession(null)}
                size="sm"
              >
                New Case
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Patient Scenario */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Patient Case
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {currentSession.scenario}
                    </ReactMarkdown>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat History */}
            <Card>
              <CardHeader>
                <CardTitle>Clinical Discussion</CardTitle>
                <CardDescription>
                  Chat with your attending physician • Points are awarded for helpful questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto mb-4">
                  {currentSession.chat_history.map((entry) => formatMessage(entry))}
                </div>

                {currentSession.current_stage !== "completed" && (
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ask questions, request tests, or discuss your findings..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendChatMessage} 
                      disabled={loading}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            {currentSession.current_stage !== "completed" && (
              <>
                {/* Test Ordering */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Tests</CardTitle>
                    <CardDescription>
                      Choose appropriate tests • Earn points for correct choices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Test Type</label>
                      <select
                        value={selectedTest.type}
                        onChange={(e) => setSelectedTest({...selectedTest, type: e.target.value})}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        <option value="">Select test type</option>
                        <option value="x-ray">X-Ray</option>
                        <option value="mri">MRI</option>
                        <option value="ct_scan">CT Scan</option>
                        <option value="blood_test">Blood Test</option>
                        <option value="ultrasound">Ultrasound</option>
                        <option value="ecg">ECG</option>
                        <option value="echo">Echocardiogram</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Body Part/Area</label>
                      <Input
                        placeholder="e.g., chest, knee, abdomen"
                        value={selectedTest.bodyPart}
                        onChange={(e) => setSelectedTest({...selectedTest, bodyPart: e.target.value})}
                        className="text-sm"
                      />
                    </div>
                    <Button 
                      onClick={requestTest}
                      disabled={!selectedTest.type || loading}
                      className="w-full"
                      size="sm"
                    >
                      Order Test
                    </Button>
                  </CardContent>
                </Card>

                {/* Diagnosis Submission */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Submit Diagnosis</CardTitle>
                    <CardDescription>
                      Provide your final diagnosis • Earn big points for accuracy
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Enter your final diagnosis and reasoning..."
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button 
                      onClick={submitDiagnosis}
                      disabled={!diagnosis.trim() || loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Submit Diagnosis
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Case Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Case Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Points:</span>
                  <Badge variant="outline" className={`${getPointsColor(currentSession.total_points)} border-current`}>
                    {getPointsIcon(currentSession.total_points)}
                    <span className="ml-1">{currentSession.total_points}</span>
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Diagnosis Attempts:</span>
                  <Badge variant="outline">{currentSession.diagnosis_attempts}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Cost:</span>
                  <Badge variant="outline" className="text-green-600">
                    ${currentSession.total_cost}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <Badge variant={currentSession.current_stage === "completed" ? "default" : "secondary"}>
                    {currentSession.current_stage === "completed" ? "Completed" : "In Progress"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;