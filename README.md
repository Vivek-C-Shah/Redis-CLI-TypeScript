# Redis-like Server in TypeScript

## Overview

This project is a simplified Redis-like server built using TypeScript. It implements core features of Redis, such as key-value storage, transactions, streams, replication, and more. The server is designed to handle commands using the RESP (REdis Serialization Protocol) and provides a robust foundation for understanding the internals of a Redis-like in-memory database.

## Features

### 1. Basic Key-Value Operations
- **SET Command**: Store a key-value pair in memory.
- **GET Command**: Retrieve the value associated with a key.
- **Key Expiration**: Optionally set a TTL (Time-To-Live) for keys.

### 2. Transactions
- **MULTI/EXEC**: Group multiple commands into an atomic transaction.
- **DISCARD**: Cancel a transaction.

### 3. Stream Operations
- **XADD**: Add entries to a stream.
- **XRANGE**: Retrieve entries from a stream within a specified range.

### 4. List Operations
- **LPUSH**: Add an element to the head of a list.
- **RPUSH**: Add an element to the tail of a list.
- **LPOP**: Remove and return the first element of a list.
- **RPOP**: Remove and return the last element of a list.
- **LLEN**: Get the length of a list.
- **LRANGE**: Get a range of elements from a list.
- **LTRIM**: Trim a list to a specified range.
- **LMOVE**: Atomically move elements from one list to another.
- **LINDEX**: Get an element at a specific index in a list.
- **LSET**: Set the value of an element in a list at a specific index.
- **LREM**: Remove elements from a list.
- **LINSERT**: Insert an element before or after another element in a list.
- **LGETALL**: Retrieve all elements in a list.

### 5. Pub/Sub (Publish/Subscribe)
- **SUBSCRIBE**: Subscribe to a channel to receive messages.
- **UNSUBSCRIBE**: Unsubscribe from a channel.
- **PUBLISH**: Publish a message to a channel.

### 6. Replication
- **REPLCONF/PSYNC**: Support for master-slave replication.

### 7. Persistence
- **RDB Loading**: Load key-value pairs from an RDB file on server startup.

### 8. Basic Commands
- **PING**: Test server responsiveness.
- **ECHO**: Echo back the provided message.
- **INFO**: Retrieve server information.

### 9. Advanced Commands
- **WAIT**: Block until write commands are acknowledged by replicas.

## Installation

### Prerequisites
- **Node.js**: Ensure you have Node.js installed (v14.x or higher recommended).
- **TypeScript**: The project is built using TypeScript, so make sure to have TypeScript installed.

### Steps

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Vivek-C-Shah/Redis-CLI-TypeScript.git
   cd Redis-CLI-TypeScript
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Run the Server:**

   ```bash
   npm start -- --port 6379
   ```

   You can specify a different port if needed.

4. **Connect using Redis CLI:**

   ```bash
   redis-cli -p 6379
   ```

## Usage

### Basic Key-Value Operations

- **SET Command:**

  ```bash
  SET mykey "Hello, World!"
  ```

- **GET Command:**

  ```bash
  GET mykey
  ```

### Transactions

- **Start a Transaction:**

  ```bash
  MULTI
  ```

- **Queue Commands:**

  ```bash
  SET key1 "Value1"
  SET key2 "Value2"
  ```

- **Execute the Transaction:**

  ```bash
  EXEC
  ```

- **Discard the Transaction:**

  ```bash
  DISCARD
  ```

### Stream Operations

- **Add to Stream:**

  ```bash
  XADD mystream * field1 "value1"
  ```

- **Read from Stream:**

  ```bash
  XRANGE mystream 0-0 +
  ```

### List Operations

- **Add Elements to a List:**

  ```bash
  LPUSH mylist "first"
  RPUSH mylist "second"
  ```

- **Remove Elements from a List:**

  ```bash
  LPOP mylist
  RPOP mylist
  ```

- **Get the Length of a List:**

  ```bash
  LLEN mylist
  ```

- **Get a Range of Elements from a List:**

  ```bash
  LRANGE mylist 0 -1
  ```

- **Trim a List to a Specified Range:**

  ```bash
  LTRIM mylist 0 1
  ```

- **Move Elements Between Lists:**

  ```bash
  LMOVE list1 list2 LEFT RIGHT
  ```

- **Get an Element by Index:**

  ```bash
  LINDEX mylist 0
  ```

- **Set the Value of an Element at a Specific Index:**

  ```bash
  LSET mylist 0 "new_value"
  ```

- **Remove Elements from a List:**

  ```bash
  LREM mylist 1 "value_to_remove"
  ```

- **Insert an Element Before or After Another Element:**

  ```bash
  LINSERT mylist BEFORE "pivot_value" "new_value"
  ```

- **Retrieve All Elements in a List:**

  ```bash
  LGETALL mylist
  ```

### Pub/Sub Operations

- **Subscribe to a Channel:**

  ```bash
  SUBSCRIBE mychannel
  ```

- **Unsubscribe from a Channel:**

  ```bash
  UNSUBSCRIBE mychannel
  ```

- **Publish a Message to a Channel:**

  ```bash
  PUBLISH mychannel "Hello, Subscribers!"
  ```

### Replication

Start the server on a different port as a replica:

```bash
npm start -- --port 6380 --replicaof 127.0.0.1 6379
```

### Persistence

Place an RDB file in the specified directory, and it will be loaded upon server start:

```bash
npm start -- --dir ./data --dbfilename dump.rdb
```

## Project Structure

- **src/**: Contains all the TypeScript source code.

- **dist/**: Contains the compiled JavaScript files.

- **test/**: Tests for the various functionalities.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your changes. Ensure that your code is well-tested and documented.

## License

This project is licensed under the MIT License.

## Author

**Vivek Shah**

- **LinkedIn**: [Vivek Shah](https://www.linkedin.com/in/the-cipher-vivek/)
- **GitHub**: [Vivek-C-Shah](https://github.com/Vivek-C-Shah/)
- **Twitter**: [@ShVivek25](https://x.com/ShVivek25)
