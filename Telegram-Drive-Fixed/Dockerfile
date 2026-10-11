FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run via start_main.py to dynamically bind to PORT (default 8000) and pass Koyeb health checks
CMD ["python3", "start_main.py"]
