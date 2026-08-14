import { useQuery } from "@tanstack/react-query";

interface HealthResponse {
  status: string;
}

function App() {
  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      return res.json();
    },
  });

  return (
    <div>
      <h1>todo-os</h1>
      <p>API status: {isLoading ? "loading..." : data?.status}</p>
    </div>
  );
}

export default App;
