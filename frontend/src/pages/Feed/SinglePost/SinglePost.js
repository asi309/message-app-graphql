import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

const BASE_URL = 'http://localhost:8080';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: '',
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query: `
        query fetchSinglePost($id: ID!){
          fetchPost(id: $id) {
            title
            content
            imageUrl
            creator {
              name
            }
            createdAt
          }
        }
      `,
      variables: {
        id: postId,
      },
    };

    fetch(`${BASE_URL}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error('An error occured');
        }
        this.setState({
          title: resData.data.fetchPost.title,
          author: resData.data.fetchPost.creator.name,
          image: `${BASE_URL}/${resData.data.fetchPost.imageUrl}`,
          date: new Date(resData.data.fetchPost.createdAt).toLocaleDateString(
            'en-US'
          ),
          content: resData.data.fetchPost.content,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
