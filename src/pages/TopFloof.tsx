import { useState } from "react";

interface Floof {
  id: string;
  name: string;
  image: string;
  rating: string;
  description: string;
  votes: number;
}

const initialFloofs: Floof[] = [
  {
    id: "floof-pfp1",
    name: "Lucky Foxy",
    image: "/images/floof-pfp1.png",
    rating: "95%",
    description: "Bringing good luck to those who find him.",
    votes: 120,
  },
  {
    id: "floof-pfp2",
    name: "Fiery Trio",
    image: "/images/floof-pfp2.jpg",
    rating: "93%",
    description: "Heating things up with their sizzling style.",
    votes: 115,
  },
  {
    id: "floof-pfp3",
    name: "Cyberfox",
    image: "/images/floof-pfp3.jpg",
    rating: "92%",
    description: "Navigating the digital realm with ease.",
    votes: 108,
  },
  {
    id: "floof-pfp4",
    name: "Angel Paws",
    image: "/images/floof-pfp4.jpg",
    rating: "90%",
    description: "Watching over the floof kingdom from the skies.",
    votes: 95,
  },
];

export default function TopFloof() {
  const [floofs, setFloofs] = useState(initialFloofs.sort((a, b) => b.votes - a.votes));

  const handleUpvote = (id: string) => {
    setFloofs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, votes: f.votes + 1 } : f)).sort((a, b) => b.votes - a.votes)
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-800 mb-2">Top Floofs of All Time</h1>
          <p className="text-lg text-gray-600">The community's favorite floofs, ranked by popular vote.</p>
        </div>

        <div className="space-y-8">
          {floofs.map((floof, index) => (
            <div key={floof.id} className="bg-white rounded-lg shadow-lg p-6 flex items-center transform hover:scale-105 transition-transform duration-300">
              <span className="text-4xl font-bold text-gray-400 mr-6">#{index + 1}</span>
              <img src={floof.image} alt={floof.name} className="w-24 h-24 rounded-full object-cover mr-6 border-4 border-gray-200" />
              <div className="flex-grow">
                <h2 className="text-3xl font-bold text-gray-800">{floof.name}</h2>
                <p className="text-gray-600 italic">"{floof.description}"</p>
                <p className="text-lg text-pink-500 font-semibold mt-1">Floof Rating: {floof.rating}</p>
              </div>
              <div className="text-center">
                <button
                  className="bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors duration-300"
                  onClick={() => handleUpvote(floof.id)}
                >
                  Upvote
                </button>
                <p className="text-2xl font-bold text-gray-800 mt-2">{floof.votes}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
