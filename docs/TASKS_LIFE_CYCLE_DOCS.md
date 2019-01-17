# Tasks Life Cycle 
There are 2 type of tasks, Deploy Secret Contracts and Compute something with existing Secret Contracts. 


# Task Manager enigma-p2p
The TaskManager class is responsible for all the things that are related to the business logic of the tasks life cycle. 

# Task ID
Every task is identified by it's unique global id both in the system and in the network.

# Task Statuses 

<details>
  <summary>Unverified</summary>
  <p>3 things needs to be verified:
    <ul>
  <li>The worker verifies it is indeed the selected worker</li>
  <li>The worker verifies that payment details</li>
  <li>The worker verifies the InputsHash</li>
  </ul>
  The task will not be even stored on disk (i.e stay in memory) unless it is verified.
  </p>
</details>
<details>
  <summary>In-Progress</summary>
  <p>Once a task is verified it is sent to `enigma-core` for execution and saved on Disk for the purpose of persistence and RAM usage reduce </p>
</details>
<details>
  <summary>Success</summary>
  <p>Indicates that a task was finished successfully. Always includes a result attached.</p>
</details>
<details>
  <summary>Failed</summary>
  <p>Indicates that the task execution failed. Always includes an error message.</p>
</details>

# Task Result Propagation in the network
All the task results either `Failed` or `Success` + the result are published to a topic  called `/task_status/0.1`. 
That is how the nodes including the **Gateway** node of the user will be informed once the result is done. 

# Communication with the selected worker. 
Both for requests and status checks the communication is done via the `JsonRpc` component. 
The worker can response to a status check at any time. 