/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students. *
* Name: Gurtarnjit Singh       Student ID: 156805210 Date: 11/27/2022 *
* Online (Cyclic) Link: https://prickly-undershirt-fish.cyclic.app/
* ********************************************************************************/

const HTTP_PORT = process.env.PORT || 8080;
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const dataservice = require("./data_service");
const exphbs = require('express-handlebars');
const dataServiceAuth = require("./data-service-auth");
const clientSessions = require("client-sessions");

app.use(clientSessions({
    cookieName: "session",
    secret: "Web322 course is interesting",
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 1000 * 60 * 60 * 24
}));

app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
});

function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

const storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.engine('.hbs', exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
        navLink: function (url, options) {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        }
    }
}));

app.set('view engine', '.hbs');

onHttpStart = () => {
    console.log('Express http server listening on port ' + HTTP_PORT);
}

//use
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
    let route = req.baseUrl + req.path;
    app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
});

//home
app.get('/', (req, res) => {
    res.render(path.join(__dirname + "/views/home.hbs"));
});

//otherwise /home would return an error
app.get('/home', (req, res) => {
    res.render(path.join(__dirname + "/views/home.hbs"));
});

//about
app.get('/about', (req, res) => {
    res.render(path.join(__dirname + "/views/about.hbs"));
});

//employees
app.get("/employees", ensureLogin, (req, res) => {
    if (req.query.status) {
        dataservice.getEmployeeByStatus(req.query.status).then((data) => {
            res.render("employees", { employees: data });
        }).catch((err) => {
            res.render({ message: "no results" });
        })
    }
    else if (req.query.department) {
        dataservice.getEmployeesByDepartment(req.query.department).then((data) => {
            res.render("employees", { employees: data });
        }).catch((err) => {
            res.render({ message: "no results" });
        })
    }
    else if (req.query.manager) {
        dataservice.getEmployeesByManager(req.query.manager).then((data) => {
            res.render("employees", { employees: data });
        }).catch((err) => {
            res.render({ message: "no results" });
        })
    }
    else {
        dataservice.getAllEmployees().then((data) => {
            res.render("employees", { employees: data });
        }).catch((err) => {
            res.render("employees", { message: "no results" });
        })
    }
});

app.get('/employees/add', ensureLogin, (req, res) => {
    dataservice.getDepartments().then(data => {
        res.render("addEmployees.hbs", {
            departments: data
        });
    }).catch(err => {
        res.render("addEmployees.hbs", {
            departments: []
        });
    })

});
app.post('/employees/add', ensureLogin, (req, res) => {
    dataservice.addEmployee(req.body).then(() => {
        res.redirect("/employees");
    }).catch(err => {
        res.send(err)
    })
});
app.post('/employee/update', ensureLogin, (req, res) => {
    dataservice.updateEmployee(req.body).then(() => {
        res.redirect("/employees");
    }).catch((err) => {
        res.send(err)
    })
});


// new routes added in Assignment 5 - START
app.get('/departments/add', ensureLogin, (req, res) => {
    res.render(path.join(__dirname + "/views/addDepartment.hbs"));
});
app.post('/departments/add', ensureLogin, (req, res) => {
    dataservice.addDepartment(req.body).then(() => {
        res.redirect("/departments");
    }).catch(err => {
        res.send(err)
    })
});
app.post('/departments/update', ensureLogin, (req, res) => {
    dataservice.updateDepartment(req.body).then(() => {
        res.redirect("/departments");
    }).catch((err) => {
        res.send(err)
    })
});
app.get("/employee/:empNum", ensureLogin, (req, res) => {
    // initialize an empty object to store the values
    let viewData = {};
    dataservice.getEmployeeByNum(req.params.empNum).then((data) => {
        if (data) {
            viewData.employee = data; //store employee data in the "viewData" object as "employee"
        } else {
            viewData.employee = null; // set employee to null if none were returned
        }
    }).catch(() => {
        viewData.employee = null; // set employee to null if there was an error
    }).then(dataservice.getDepartments)
        .then((data) => {
            viewData.departments = data; // store department data in the "viewData" object as
            "departments"
            // loop through viewData.departments and once we have found the departmentId that matches
            // the employee's "department" value, add a "selected" property to the matching
            // viewData.departments object13
            for (let i = 0; i < viewData.departments.length; i++) {
                if (viewData.departments[i].departmentId == viewData.employee.department) {
                    viewData.departments[i].selected = true;
                }
            }
        }).catch(() => {
            viewData.departments = []; // set departments to empty if there was an error
        }).then(() => {
            if (viewData.employee == null) { // if no employee - return an error
                res.status(404).send("Employee Not Found");
            } else {
                res.render("employee", { viewData: viewData }); // render the "employee" view
            }
        });
});

app.get("/employees/delete/:empNum", ensureLogin, (req, res) => {
    dataservice.deleteEmployeeByNum(req.params.empNum).then(() => {
        res.redirect("/employees");
    }).catch(() => res.status(500).send("Unable to Remove Employee / Employee not found)"));
})
// new routes added in Assignment 5  - END

// new routes added in Assignment 6  - START

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/login", (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    dataServiceAuth.checkUser(req.body).then((user) => {
        req.session.user = {
            userName: user.userName,
            email: user.email,
            loginHistory: user.loginHistory
        }
        res.redirect('/employees');
    }).catch(err => {
        res.render("login", { errorMessage: err, userName: req.body.userName })
    })
})

app.post("/register", (req, res) => {
    dataServiceAuth.registerUser(req.body).then(() => {
        res.render("register", {
            successMessage: "User created"
        })
    }).catch(err => {
        res.render("register", {
            errorMessage: err,
            userName: req.body.userName
        })
    })
})

app.get("/logout", function (req, res) {
    req.session.reset();
    res.redirect("/login");
});

app.get('/userHistory', ensureLogin, function (req, res) {
    res.render('userHistory');
})


// new routes added in Assignment 6  - END





app.get('/department/:value', ensureLogin, (req, res) => {

    dataservice.getDepartmentById(req.params.value).then((data) => {
        res.render("department", { employee: data[0] });
    }).catch((err) => {
        res.status(404).send("Department Not Found");
    })
});



//images
app.get('/images/add', ensureLogin, (req, res) => {
    res.render(path.join(__dirname + "/views/addImage.hbs"));
});

app.post("/images/add", ensureLogin, upload.single("imageFile"), (req, res) => {
    res.redirect("/images");
});

app.get("/images", ensureLogin, (req, res) => {
    fs.readdir("./public/images/uploaded", function (err, items) {
        res.render("images", { data: items });
    })
});


//managers
app.get("/managers", (req, res) => {
    dataservice.getManagers().then((data) => {
        res.json({ data });
    }).catch((err) => {
        res.json({ message: err });
    })
});


//departments
app.get("/departments", ensureLogin, (req, res) => {
    dataservice.getDepartments().then((data) => {
        res.render("departments", { departments: data });

    }).catch((err) => {
        res.render("departments", { message: "no results" });
    })
});

// page not found route
app.use((req, res) => {
    res.status(404).end('404 PAGE NOT FOUND');
});

dataservice.initialize()
    .then(dataServiceAuth.initialize)
    .then(() => {
        app.listen(HTTP_PORT, onHttpStart())
    }).catch(() => {
        console.log('promises unfulfilled');
    });