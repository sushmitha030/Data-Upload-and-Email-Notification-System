### MathonGo Sample Task Backend Development README
* [Postman Documentation Link](https://docs.google.com/document/d/1RZa4Wll3MlXmc75gKgp79sEs3tYkj7Vz0cmi-8ZbGC0/edit?usp=sharing) For running all the routes.

### Steps for running the Project

* Clone this Project using this [link](https://github.com/sushmitha030/Data-Upload-and-Email-Notification-System.git).
* Run `npm install` to install all the dependencies.
* Make an .env file
* Add the following fields into the .env file PORT(Port for running of server), MONGO_URL(URL for the MONGO_DB), EMAIL_ID(Email Id to send emails to the users), PASSWORD(Password for the email), SMTP_HOST(smtp.gmail.com)
* Run `npm start` to start the server.

### Database Schema 
* Every user in the database will have the following fields: name, email, and all the custom properties present in the CSV header, like city, etc. In addition to these fields, every document will have isActive initialized to true and userId which will be autoincremented.
* Reference Schema will be {name: {type: String}, email: {type: String}, userId : {type: number}, isActive : {type: Boolean}, all Custom headers of the csv file}.

### API
Three routes have been implemented

1) **/admin/add-users (POST)**

  * This route will have form data, in the body we will have the file and the file uploaded, and the other will be customProperties and the JSON in the form of text. 
    It will take all the headers and create or update the dynamic schema with all the CSV file headers.
  * After that, while the addition of the users, it will get all the emails present in the database, firstly check whether the row data has an empty name or email, and then it will be added to the errors Array
  * Then, it will check whether the email is already in the database. If present, it will not add it to the database.
  * Then, in the response it will give the message and the link to download the updated CSV File.

**Reference Image:**
![image](https://github.com/GurudeepRahul/MathonGo_InternshipProject/assets/87088087/5cc160b2-7251-4aac-ac19-f1ab1c8ffb40)

2) **/download/:fileType-csv (GET)**

  * This route will have a path param called fileType-csv where we will enter the file name we want to download.
  * When the request is hit then, it will give you the list of all the entries that are added to the database and return the list in the form of a CSV File.

**Reference Image**
![image](https://github.com/GurudeepRahul/MathonGo_InternshipProject/assets/87088087/130c2393-cfd7-41cf-883d-6490093dfd77)

3) **/admin/send-email (POST)**

  * This route will have two query params, `startUserId and lastUserId`. These will be the startUserId and the lastUserId of the users to send the emails.
  * Then, we will query the user from the database and insert those attribute values into the HTML and text fields to send an email and unsubscribe link.
  * Mails will only be sent to the users who have not unsubscribed.
  * we made use of nodemailer to send mails to the users. 

**Reference Image:**
![image](https://github.com/GurudeepRahul/MathonGo_InternshipProject/assets/87088087/9b03b117-cc69-4ca5-8558-ac51d40dda41)

4) **/admin/unsubscribe-user (GET)**

  * We will have userId as query Param make use of the isActive field in the database. When the user clicks the link in the email, we will redirected to this route, and the isActive of that user is made false.
  * If the user for that userId is not found, then it will send a Not Found User response.

![image](https://github.com/GurudeepRahul/MathonGo_InternshipProject/assets/87088087/e11b622a-f02a-44db-a5d5-b78da8914e4e)

