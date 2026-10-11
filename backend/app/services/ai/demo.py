from app.services.ai.base import AIProvider, ProviderResult

_SAMPLE = [
    ("What does CPU stand for?", ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Utility"], 0,
     "CPU stands for Central Processing Unit, the component that executes instructions."),
    ("Which data structure uses FIFO ordering?", ["Stack", "Queue", "Tree", "Graph"], 1,
     "A queue is First-In-First-Out; a stack is Last-In-First-Out."),
    ("What is the time complexity of binary search on a sorted array?", ["O(n)", "O(n log n)", "O(log n)", "O(1)"], 2,
     "Binary search halves the search space each step, giving O(log n)."),
    ("Which HTTP method is normally used to create a resource?", ["GET", "POST", "DELETE", "HEAD"], 1,
     "POST submits data to create a new resource; GET only reads."),
    ("What does SQL stand for?", ["Structured Query Language", "Simple Question Logic", "Sequential Query List", "Standard Quote Language"], 0,
     "SQL is Structured Query Language, used to query relational databases."),
]
_CARDS = [
    ("Algorithm", "A finite, ordered set of steps that solves a problem."),
    ("Variable", "A named storage location whose value can change."),
    ("API", "A defined interface that lets software components communicate."),
    ("Database index", "A structure that speeds up lookups at the cost of extra storage and slower writes."),
    ("Recursion", "A technique where a function calls itself on a smaller input until a base case is reached."),
]


class DemoProvider(AIProvider):
    """Deterministic sample content. Makes NO AI request; the UI labels results as Demo."""
    name = "demo"

    def generate_structured(self, prompt: str) -> ProviderResult:
        return ProviderResult(data={
            "questions": [{"text": t, "options": o, "correct_index": c, "explanation": e, "difficulty": "easy"}
                          for t, o, c, e in _SAMPLE],
            "flashcards": [{"front": f, "back": b} for f, b in _CARDS],
        })
